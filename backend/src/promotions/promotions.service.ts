import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion, PromotionType } from './entities/promotion.entity';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

export interface AppliedDiscount {
  discount: number;
  freeShipping: boolean;
  applied: Promotion[];
}

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private readonly repo: Repository<Promotion>,
  ) {}

  async create(dto: CreatePromotionDto): Promise<Promotion> {
    const promotion = this.repo.create({
      ...dto,
      startDate: this.parseDate(dto.startDate),
      endDate: this.parseDate(dto.endDate, true),
    });
    return this.repo.save(promotion);
  }

  async findAll(): Promise<Promotion[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findActive(): Promise<Promotion[]> {
    const promotions = await this.findAll();
    return promotions.filter((p) => p.isCurrentlyActive);
  }

  async findOne(id: string): Promise<Promotion> {
    const promotion = await this.repo.findOne({ where: { id } });
    if (!promotion) throw new NotFoundException('Promoción no encontrada');
    return promotion;
  }

  async update(id: string, dto: UpdatePromotionDto): Promise<Promotion> {
    const promotion = await this.findOne(id);
    const data = { ...dto } as any;
    if (data.startDate) data.startDate = this.parseDate(data.startDate);
    if (data.endDate) data.endDate = this.parseDate(data.endDate, true);
    Object.assign(promotion, data);
    return this.repo.save(promotion);
  }

  async remove(id: string): Promise<void> {
    const promotion = await this.findOne(id);
    await this.repo.remove(promotion);
  }

  /**
   * A date-only value (`2026-11-04`) means the WHOLE day. If it were parsed as
   * midnight, a promotion whose end date is today would already look inactive
   * from 00:00 — and in Argentina (UTC-3) from 21:00 of the previous day.
   */
  private parseDate(value: string, endOfDay = false): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
    }
    return new Date(value);
  }

  /**
   * Applies the active promotions to a cart/order.
   * Returns the total discount and whether shipping is free.
   */
  async applyPromotions(
    subtotal: number,
    lineCategoryIds: string[],
    lineProductIds: string[],
  ): Promise<AppliedDiscount> {
    const active = await this.findActive();
    let discount = 0;
    let freeShipping = false;
    const applied: Promotion[] = [];

    for (const promotion of active) {
      switch (promotion.type) {
        case PromotionType.FREE_SHIPPING:
          if (subtotal >= promotion.value) {
            freeShipping = true;
            applied.push(promotion);
          }
          break;

        case PromotionType.PERCENTAGE_DISCOUNT: {
          const matches = this.promotionApplies(promotion, lineProductIds, lineCategoryIds);
          if (matches) {
            const promoDiscount = subtotal * (Number(promotion.value) / 100);
            discount += promoDiscount;
            applied.push(promotion);
          }
          break;
        }

        case PromotionType.FIXED_DISCOUNT:
        case PromotionType.SPECIAL_OFFER: {
          const matches = this.promotionApplies(promotion, lineProductIds, lineCategoryIds);
          if (matches) {
            discount += Math.min(Number(promotion.value), subtotal);
            applied.push(promotion);
          }
          break;
        }
      }
    }

    discount = Math.min(discount, subtotal);
    return { discount, freeShipping, applied };
  }

  private promotionApplies(
    promotion: Promotion,
    productIds: string[],
    categoryIds: string[],
  ): boolean {
    if (promotion.productIds?.length) {
      return productIds.some((id) => promotion.productIds.includes(id));
    }
    if (promotion.categoryIds?.length) {
      return categoryIds.some((id) => promotion.categoryIds.includes(id));
    }
    return true;
  }
}