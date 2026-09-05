import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentMethod as PaymentMethodEntity, PaymentStatus } from './entities/payment.entity';
import { PAYMENT_PROVIDER, PaymentProvider, PaymentMethod } from './providers/payment-provider.interface';

export interface CreatePaymentData {
  method: PaymentMethod;
  cardNumber?: string;
  cardHolder?: string;
  cardExpiry?: string;
  cardCvc?: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly repo: Repository<Payment>,
    @Inject(PAYMENT_PROVIDER)
    private readonly provider: PaymentProvider,
  ) {}

  async createPayment(orderId: string, amount: number, data: CreatePaymentData): Promise<Payment> {
    const result = await this.provider.processPayment({
      amount,
      method: data.method,
      cardNumber: data.cardNumber,
      cardHolder: data.cardHolder,
      cardExpiry: data.cardExpiry,
      cardCvc: data.cardCvc,
    });

    const payment = this.repo.create({
      orderId,
      amount,
      method: data.method as PaymentMethodEntity,
      status: result.status as PaymentStatus,
      reference: result.reference,
      message: result.message,
      cardBrand: result.cardBrand,
      lastFour: result.lastFour,
      approvedAt: result.status === 'APPROVED' ? new Date() : undefined,
    });

    return this.repo.save(payment);
  }

  async approve(id: string): Promise<Payment> {
    const payment = await this.findOne(id);
    if (payment.status === PaymentStatus.REJECTED) {
      throw new BadRequestException('Un pago rechazado no puede aprobarse');
    }
    payment.status = PaymentStatus.APPROVED;
    payment.approvedAt = new Date();
    payment.message = 'Pago aprobado por el administrador.';
    return this.repo.save(payment);
  }

  async reject(id: string, reason?: string): Promise<Payment> {
    const payment = await this.findOne(id);
    payment.status = PaymentStatus.REJECTED;
    payment.message = reason || 'Pago rechazado por el administrador.';
    return this.repo.save(payment);
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.repo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    return payment;
  }

  async findByOrder(orderId: string): Promise<Payment | null> {
    return this.repo.findOne({ where: { orderId } });
  }

  async findAll(): Promise<Payment[]> {
    return this.repo.find({ order: { createdAt: 'DESC' }, relations: { order: true } });
  }
}