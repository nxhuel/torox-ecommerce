import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FinanceMovement,
  MovementType,
  MovementCategory,
} from './entities/finance-movement.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(FinanceMovement)
    private readonly repo: Repository<FinanceMovement>,
  ) {}

  async recordIncome(
    description: string,
    amount: number,
    referenceId?: string,
    date: Date = new Date(),
  ): Promise<FinanceMovement> {
    return this.record({
      type: MovementType.INCOME,
      category: MovementCategory.SALE,
      description,
      amount,
      date,
      referenceId,
    });
  }

  async recordExpense(dto: CreateExpenseDto): Promise<FinanceMovement> {
    return this.record({
      type: MovementType.EXPENSE,
      category: dto.category,
      description: dto.description,
      amount: dto.amount,
      date: dto.date ? new Date(dto.date) : new Date(),
    });
  }

  async record(movement: Partial<FinanceMovement>): Promise<FinanceMovement> {
    const entity = this.repo.create(movement);
    return this.repo.save(entity);
  }

  async findAll(page = 1, limit = 20, type?: MovementType): Promise<{ data: FinanceMovement[]; meta: any }> {
    const where: any = {};
    if (type) where.type = type;

    const [data, total] = await this.repo.findAndCount({
      where,
      order: { date: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<FinanceMovement> {
    const movement = await this.repo.findOne({ where: { id } });
    if (!movement) throw new NotFoundException('Movimiento no encontrado');
    return movement;
  }

  async getSummary() {
    const movements = await this.repo.find();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalIncome = movements
      .filter((m) => m.type === MovementType.INCOME)
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const totalExpense = movements
      .filter((m) => m.type === MovementType.EXPENSE)
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const monthIncome = movements
      .filter((m) => m.type === MovementType.INCOME && new Date(m.date) >= monthStart)
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const monthExpense = movements
      .filter((m) => m.type === MovementType.EXPENSE && new Date(m.date) >= monthStart)
      .reduce((sum, m) => sum + Number(m.amount), 0);

    return {
      totalIncome,
      totalExpense,
      profit: totalIncome - totalExpense,
      monthIncome,
      monthExpense,
      monthProfit: monthIncome - monthExpense,
      movementCount: movements.length,
    };
  }

  async getMonthlySeries(months = 12): Promise<{ month: string; label: string; income: number; expense: number }[]> {
    const movements = await this.repo.find();
    const now = new Date();
    const series: { month: string; label: string; income: number; expense: number }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthMovements = movements.filter(
        (m) =>
          m.date.getFullYear() === date.getFullYear() &&
          m.date.getMonth() === date.getMonth(),
      );
      series.push({
        month: key,
        label: date.toLocaleDateString('es-AR', { month: 'short' }),
        income: monthMovements
          .filter((m) => m.type === MovementType.INCOME)
          .reduce((sum, m) => sum + Number(m.amount), 0),
        expense: monthMovements
          .filter((m) => m.type === MovementType.EXPENSE)
          .reduce((sum, m) => sum + Number(m.amount), 0),
      });
    }
    return series;
  }

  async getByCategory(): Promise<{ category: string; amount: number }[]> {
    const movements = await this.repo.find();
    const map = new Map<string, number>();
    for (const m of movements) {
      const key = `${m.type}:${m.category}`;
      map.set(key, (map.get(key) || 0) + Number(m.amount));
    }
    return [...map.entries()].map(([key, amount]) => {
      const [type, category] = key.split(':');
      return { category: `${type}_${category}`, amount };
    });
  }
}