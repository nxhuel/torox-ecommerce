import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Like, Between, MoreThan } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const slug = dto.slug || this.generateSlug(dto.name);
    const sku = dto.sku || `TORX-${Date.now()}`;
    const product = this.repo.create({ ...dto, slug, sku });
    await this.repo.save(product);
    return this.findOne(product.id);
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

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findFeatured(): Promise<Product[]> {
    return this.repo.find({ where: { isFeatured: true, isActive: true }, take: 8 });
  }

  async findOnSale(): Promise<Product[]> {
    return this.repo.find({ where: { isOnSale: true, isActive: true }, take: 8 });
  }

  async findOne(id: string): Promise<Product> {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Producto no encontrado');
    return p;
  }

  async findBySlug(slug: string): Promise<Product> {
    const p = await this.repo.findOne({ where: { slug } });
    if (!p) throw new NotFoundException('Producto no encontrado');
    return p;
  }

  async findRelated(productId: string, categoryId: string, limit = 4): Promise<Product[]> {
    return this.repo.find({
      where: { categoryId, isActive: true },
      take: limit,
    });
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const p = await this.findOne(id);
    Object.assign(p, dto);
    await this.repo.save(p);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const p = await this.findOne(id);
    await this.repo.remove(p);
  }

  async decreaseStock(id: string, quantity: number): Promise<void> {
    const p = await this.findOne(id);
    if (p.stock < quantity) throw new BadRequestException('Stock insuficiente');
    p.stock -= quantity;
    p.salesCount += quantity;
    await this.repo.save(p);
  }

  async restoreStock(id: string, quantity: number): Promise<void> {
    const p = await this.findOne(id);
    p.stock += quantity;
    await this.repo.save(p);
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

  private generateSlug(name: string): string {
    return name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();
  }
}
