import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Like, Between, MoreThan } from 'typeorm';
import { Product } from './entities/product.entity';
import type { ProductPromotion } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { CreateProductDto, ProductVariantDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { PromotionsService } from '../promotions/promotions.service';
import type { Promotion } from '../promotions/entities/promotion.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    private readonly promotionsService: PromotionsService,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const slug = dto.slug || this.generateSlug(dto.name);
    const sku = dto.sku || `TORX-${Date.now()}`;
    const { variants, ...data } = dto;
    const product = this.repo.create({ ...data, slug, sku });
    const saved = await this.repo.save(product);

    if (variants?.length) {
      await this.syncVariants(saved.id, variants);
      await this.repo.update(saved.id, { stock: await this.variantStock(saved.id) });
    }

    return this.findOne(saved.id);
  }

  async findAll(query: QueryProductDto) {
    const { search, categoryId, brand, minPrice, maxPrice, isOnSale, isFeatured, inStock, sortBy, page = 1, limit = 12 } = query;

    // Price the customer actually pays: list price minus the discount, when any.
    const effectivePrice =
      "(CASE WHEN p.is_on_sale = true AND p.discount_percentage > 0 AND p.discount_percentage < 100 " +
      'THEN p.price * (1 - p.discount_percentage / 100) ELSE p.price END)';

    const qb = this.repo.createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'cat')
      .where('p.is_active = true');

    if (search) {
      qb.andWhere('(p.name ILIKE :search OR p.brand ILIKE :search OR p.short_description ILIKE :search)', { search: `%${search}%` });
    }
    if (categoryId) {
      const categoryIds = await this.expandCategoryWithChildren(categoryId);
      if (categoryIds.length) {
        qb.andWhere('p.category_id IN (:...categoryIds)', { categoryIds });
      } else {
        // Category doesn't exist -> force empty result.
        qb.andWhere('1 = 0');
      }
    }
    if (brand) qb.andWhere('p.brand ILIKE :brand', { brand: `%${brand}%` });
    if (minPrice !== undefined) qb.andWhere(`${effectivePrice} >= :minPrice`, { minPrice });
    if (maxPrice !== undefined) qb.andWhere(`${effectivePrice} <= :maxPrice`, { maxPrice });
    if (isOnSale) qb.andWhere('p.is_on_sale = true');
    if (isFeatured) qb.andWhere('p.is_featured = true');
    if (inStock) qb.andWhere('p.stock > 0');

    switch (sortBy) {
      case 'price_asc': qb.orderBy(effectivePrice, 'ASC'); break;
      case 'price_desc': qb.orderBy(effectivePrice, 'DESC'); break;
      case 'best_sellers': qb.orderBy('p.sales_count', 'DESC'); break;
      default: qb.orderBy('p.is_featured', 'DESC').addOrderBy('p.created_at', 'DESC');
    }

    const total = await qb.getCount();
    const items = await qb.skip((page - 1) * limit).take(limit).getMany();
    await this.decorateWithPromotions(items);

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findFeatured(): Promise<Product[]> {
    const products = await this.repo.find({ where: { isFeatured: true, isActive: true }, take: 8 });
    await this.decorateWithPromotions(products);
    return products;
  }

  async findOnSale(): Promise<Product[]> {
    const products = await this.repo.find({ where: { isOnSale: true, isActive: true }, take: 8 });
    await this.decorateWithPromotions(products);
    return products;
  }

  async findOne(id: string): Promise<Product> {
    const p = await this.repo.findOne({
      where: { id },
      relations: { variants: true },
      order: { variants: { sortOrder: 'ASC' } },
    });
    if (!p) throw new NotFoundException('Producto no encontrado');
    await this.decorateWithPromotions(p);
    return p;
  }

  async findBySlug(slug: string): Promise<Product> {
    const p = await this.repo.findOne({
      where: { slug },
      relations: { variants: true },
      order: { variants: { sortOrder: 'ASC' } },
    });
    if (!p) throw new NotFoundException('Producto no encontrado');
    await this.decorateWithPromotions(p);
    return p;
  }

  async findRelated(productId: string, categoryId: string, limit = 4): Promise<Product[]> {
    const products = await this.repo.find({
      where: { categoryId, isActive: true },
      take: limit,
    });
    await this.decorateWithPromotions(products);
    return products;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const { variants, ...data } = dto;
    await this.findOne(id);

    if (Object.keys(data).length) {
      await this.repo.update(id, data as any);
    }

    if (variants !== undefined) {
      await this.syncVariants(id, variants);
      const count = await this.variantRepo.count({ where: { productId: id } });
      if (count > 0) {
        await this.repo.update(id, { stock: await this.variantStock(id) });
      } else {
        // No variants left: the product is sold as a single item again.
        await this.repo.update(id, { variantName: null });
      }
    } else {
      const count = await this.variantRepo.count({ where: { productId: id } });
      if (count > 0) {
        await this.repo.update(id, { stock: await this.variantStock(id) });
      }
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const p = await this.findOne(id);
    await this.repo.remove(p);
  }

  async decreaseStock(id: string, quantity: number, variantId?: string): Promise<void> {
    if (variantId) {
      const variant = await this.variantRepo.findOne({ where: { id: variantId, productId: id } });
      if (!variant) throw new BadRequestException('La variante ya no existe');
      if (variant.stock < quantity) {
        throw new BadRequestException(`Stock insuficiente. Disponible: ${variant.stock}`);
      }
      variant.stock -= quantity;
      await this.variantRepo.save(variant);
      await this.repo.increment({ id }, 'salesCount', quantity);
      await this.repo.update(id, { stock: await this.variantStock(id) });
      return;
    }

    const hasVariants = await this.variantRepo.count({ where: { productId: id } });
    if (hasVariants > 0) {
      throw new BadRequestException('Tenés que elegir una variante del producto');
    }

    const p = await this.findOne(id);
    if (p.stock < quantity) throw new BadRequestException('Stock insuficiente');
    p.stock -= quantity;
    p.salesCount += quantity;
    await this.repo.save(p);
  }

  async restoreStock(id: string, quantity: number, variantId?: string): Promise<void> {
    if (variantId) {
      const variant = await this.variantRepo.findOne({ where: { id: variantId, productId: id } });
      if (variant) {
        variant.stock += quantity;
        await this.variantRepo.save(variant);
        await this.repo.update(id, { stock: await this.variantStock(id) });
        return;
      }
    }

    const p = await this.findOne(id);
    p.stock += quantity;
    await this.repo.save(p);
  }

  /**
   * Replaces the product's variant set with the one sent by the admin UI:
   * updates existing ids, inserts new ones and deletes the missing ones.
   */
  private async syncVariants(productId: string, variants: ProductVariantDto[]): Promise<void> {
    const names = variants.map((v) => v.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      throw new BadRequestException('No puede haber dos variantes con el mismo nombre');
    }

    const existing = await this.variantRepo.find({ where: { productId } });
    const incomingIds = new Set(variants.map((v) => v.id).filter(Boolean) as string[]);
    const toRemove = existing.filter((variant) => !incomingIds.has(variant.id));
    if (toRemove.length) await this.variantRepo.remove(toRemove);

    for (let index = 0; index < variants.length; index++) {
      const variant = variants[index];
      const data = {
        productId,
        name: variant.name.trim(),
        sku: variant.sku?.trim() || null,
        stock: variant.stock ?? 0,
        images: variant.images ?? [],
        isActive: variant.isActive ?? true,
        sortOrder: variant.sortOrder ?? index,
      };

      if (variant.id && existing.some((current) => current.id === variant.id)) {
        await this.variantRepo.update(variant.id, data as any);
      } else {
        await this.variantRepo.save(this.variantRepo.create(data as any));
      }
    }
  }

  /** Product stock is the sum of its variants so existing filters keep working. */
  private async variantStock(productId: string): Promise<number> {
    const variants = await this.variantRepo.find({ where: { productId } });
    return variants.reduce((sum, variant) => sum + (variant.stock || 0), 0);
  }

  async getLowStock(threshold = 5): Promise<Product[]> {
    return this.repo.find({ where: { stock: MoreThan(0), isActive: true } })
      .then(products => products.filter(p => p.stock <= threshold));
  }

  async getBrands(): Promise<string[]> {
    const products = await this.repo.find({ where: { isActive: true } });
    const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];
    return brands.sort();
  }

  /**
   * Returns the given category id plus every descendant category id,
   * so filtering by a parent category also matches products that live
   * in its subcategories.
   */
  private async expandCategoryWithChildren(categoryId: string): Promise<string[]> {
    const rows: { id: string; parent_id: string | null }[] = await this.repo.manager.query(
      'SELECT id, parent_id FROM categories',
    );
    const childrenOf = new Map<string, string[]>();
    for (const row of rows) {
      if (row.parent_id) {
        const list = childrenOf.get(row.parent_id) || [];
        list.push(row.id);
        childrenOf.set(row.parent_id, list);
      }
    }
    const result: string[] = [];
    const stack = [categoryId];
    const visited = new Set<string>();
    while (stack.length) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      result.push(current);
      for (const child of childrenOf.get(current) || []) stack.push(child);
    }
    return result;
  }

  /**
   * Attaches the best active promotion to each product. A price promotion
   * wins over free shipping when both apply; free shipping is still used as a
   * fallback so its ribbon and detail can be shown.
   */
  private async decorateWithPromotions(products: Product | Product[]): Promise<void> {
    const list = Array.isArray(products) ? products : [products];
    if (!list.length) return;

    const active = await this.promotionsService.findActive();

    for (const product of list) {
      product.applyPromotion(this.pickBestPromotion(product, active));
    }
  }

  private pickBestPromotion(product: Product, promotions: Promotion[]): ProductPromotion | null {
    const listPrice = Number(product.price);
    let best: Promotion | null = null;
    let bestSaving = 0;
    let shippingFallback: Promotion | null = null;

    for (const promotion of promotions) {
      if (!this.promotionMatches(promotion, product)) continue;

      if (promotion.type === 'FREE_SHIPPING') {
        shippingFallback = shippingFallback || promotion;
        continue;
      }

      const value = Number(promotion.value) || 0;
      let saving = 0;
      if (promotion.type === 'PERCENTAGE_DISCOUNT') {
        saving = listPrice * (Math.min(Math.max(value, 0), 100) / 100);
      } else if (promotion.type === 'FIXED_DISCOUNT' || promotion.type === 'SPECIAL_OFFER') {
        saving = Math.min(Math.max(value, 0), listPrice);
      }

      if (saving > bestSaving) {
        best = promotion;
        bestSaving = saving;
      }
    }

    const selected = best || shippingFallback;
    if (!selected) return null;
    return {
      id: selected.id,
      name: selected.name,
      type: selected.type,
      value: Number(selected.value),
      startDate: selected.startDate,
      endDate: selected.endDate,
    };
  }

  private promotionMatches(promotion: Promotion, product: Product): boolean {
    if (promotion.productIds?.length) {
      return promotion.productIds.includes(product.id);
    }
    if (promotion.categoryIds?.length) {
      return promotion.categoryIds.includes(product.categoryId);
    }
    // No scope means it applies to every product.
    return true;
  }

  private generateSlug(name: string): string {
    return name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();
  }
}
