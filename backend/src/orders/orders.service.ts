import { Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Order, OrderItem, OrderStatus, ShippingMethod } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CartService } from '../cart/cart.service';
import { ProductsService } from '../products/products.service';
import { PaymentsService } from '../payments/payments.service';
import { Payment } from '../payments/entities/payment.entity';
import { ShipmentsService } from '../shipments/shipments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { FinanceService } from '../finance/finance.service';
import { PromotionsService } from '../promotions/promotions.service';
import { MailService } from '../mail/mail.service';

const FREE_SHIPPING_THRESHOLD = 50000;
const SHIPPING_COST = 0;

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private readonly itemRepo: Repository<OrderItem>,
    private readonly cartService: CartService,
    private readonly productsService: ProductsService,
    private readonly paymentsService: PaymentsService,
    private readonly shipmentsService: ShipmentsService,
    private readonly notificationsService: NotificationsService,
    private readonly financeService: FinanceService,
    private readonly promotionsService: PromotionsService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  async createFromCart(dto: CreateOrderDto, userId?: string) {
    const cart = await this.cartService.getOrCreate(userId, dto.cartSessionId);
    if (!cart.items?.length) {
      throw new BadRequestException('El carrito está vacío');
    }

    // Validate products and stock.
    const productMap = new Map<string, any>();
    for (const item of cart.items) {
      const product = await this.productsService.findOne(item.productId);
      if (!product.isActive) {
        throw new BadRequestException(`"${product.name}" no está disponible`);
      }
      if (product.stock < item.quantity) {
        throw new BadRequestException(`Stock insuficiente para "${product.name}". Disponible: ${product.stock}`);
      }
      productMap.set(item.productId, product);
    }

    const subtotal = cart.items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0,
    );
    const lineProductIds = cart.items.map((i) => i.productId);
    const lineCategoryIds = [
      ...new Set(cart.items.map((i) => productMap.get(i.productId)?.categoryId).filter(Boolean)),
    ];

    const { discount, freeShipping } = await this.promotionsService.applyPromotions(
      subtotal,
      lineCategoryIds,
      lineProductIds,
    );

    const shippingCost =
      dto.shippingMethod === ShippingMethod.PICKUP || freeShipping
        ? 0
        : this.getShippingCost(subtotal);
    const total = subtotal - discount + shippingCost;

    const order = this.orderRepo.create({
      orderNumber: await this.nextOrderNumber(),
      userId,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      shippingAddress: dto.shippingAddress,
      shippingMethod: dto.shippingMethod,
      subtotal,
      discount,
      shippingCost,
      total,
      status: OrderStatus.PENDING_PAYMENT,
      notes: dto.notes,
      items: cart.items.map((item) => {
        const product = productMap.get(item.productId);
        return this.itemRepo.create({
          productId: item.productId,
          name: product.name,
          sku: product.sku,
          image: product.images?.[0],
          unitPrice: Number(item.unitPrice),
          quantity: item.quantity,
          subtotal: Number(item.unitPrice) * item.quantity,
        });
      }),
    });

    const saved = await this.orderRepo.save(order);

    // Decrease stock and clear the cart.
    for (const item of cart.items) {
      await this.productsService.decreaseStock(item.productId, item.quantity);
    }
    await this.cartService.clearCart(cart.id);

    // Process the payment. For MercadoPago Checkout Pro no se envía `payment`
    // desde el frontend: se crea un pago PENDING que el webhook confirmará.
    const payment = dto.payment
      ? await this.paymentsService.createPayment(saved.id, total, dto.payment)
      : await this.paymentsService.createPendingMercadoPago(saved.id, total);

    if (payment.status === 'APPROVED') {
      await this.handlePaymentApproved(saved.id, payment);
    } else if (payment.status === 'REJECTED') {
      await this.handlePaymentRejected(saved.id, payment);
    } else {
      await this.notificationsService.createForOrderCustomer(
        saved,
        NotificationType.ORDER_STATUS,
        'Pago pendiente de confirmación',
        `Tu pedido ${saved.orderNumber} quedó registrado. Estamos esperando la confirmación del pago de $${total.toLocaleString('es-AR')}.`,
        `/pedidos/${saved.id}`,
      );
      await this.mailService.sendOrderConfirmation(saved.customerEmail, saved.orderNumber, total);
    }

    return this.getOrderDetail(saved.id);
  }

  async findAll(query: {
    status?: string;
    search?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, search, userId, page = 1, limit = 10 } = query;
    const qb = this.orderRepo.createQueryBuilder('o')
      .orderBy('o.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) qb.andWhere('o.status = :status', { status });
    if (userId) qb.andWhere('o.user_id = :userId', { userId });
    if (search) {
      qb.andWhere(
        '(o.customer_name ILIKE :search OR o.customer_email ILIKE :search OR o.order_number ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getCustomerOrders(userId: string) {
    const orders = await this.orderRepo.find({
      where: { userId },
      relations: { items: true },
      order: { createdAt: 'DESC' },
    });
    return Promise.all(orders.map((o) => this.getOrderDetail(o.id)));
  }

  async getOrderDetail(id: string) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: { items: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');

    const [payment, shipment] = await Promise.all([
      this.paymentsService.findByOrder(id),
      this.shipmentsService.findByOrder(id),
    ]);

    return { ...order, payment, shipment };
  }

  async findOneForUser(id: string, user: { id: string; role: string }) {
    const order = await this.getOrderDetail(id);
    if (user.role !== 'ADMIN' && order.userId !== user.id) {
      throw new ForbiddenException('No tenés acceso a este pedido');
    }
    return order;
  }

  async approvePayment(orderId: string) {
    const order = await this.getOrderDetail(orderId);
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('El pedido está cancelado');
    }
    const payment = order.payment;
    if (!payment) throw new NotFoundException('El pedido no tiene un pago registrado');
    if (payment.status === 'APPROVED') {
      throw new BadRequestException('El pago ya fue aprobado');
    }
    const approved = await this.paymentsService.approve(payment.id);
    await this.handlePaymentApproved(orderId, approved);
    return this.getOrderDetail(orderId);
  }

  async rejectPayment(orderId: string, reason?: string) {
    const order = await this.getOrderDetail(orderId);
    const payment = order.payment;
    if (!payment) throw new NotFoundException('El pedido no tiene un pago registrado');
    if (payment.status === 'REJECTED') {
      throw new BadRequestException('El pago ya fue rechazado');
    }
    const rejected = await this.paymentsService.reject(payment.id, reason);
    await this.handlePaymentRejected(orderId, rejected, reason);
    return this.getOrderDetail(orderId);
  }

  async startMercadoPagoPayment(orderId: string, paymentData: { customerEmail: string; customerName?: string; customerPhone?: string }) {
    const order = await this.orderRepo.findOne({ where: { id: orderId }, relations: { items: true } });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('El pedido no está en estado PENDING_PAYMENT');
    }

    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    
    // Create preference via MercadoPago service
    const result = await this.paymentsService.createMercadoPagoPreference({
      orderId,
      amount: Number(order.total),
      items: order.items.map(i => ({
        id: i.productId,
        name: i.name,
        image: i.image,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
      })),
      customer: {
        email: paymentData.customerEmail,
        name: paymentData.customerName,
        phone: paymentData.customerPhone,
      },
      shippingAddress: order.shippingAddress ? {
        province: order.shippingAddress.province,
        city: order.shippingAddress.city,
        postalCode: order.shippingAddress.postalCode,
        address: order.shippingAddress.address,
        number: order.shippingAddress.number,
      } : undefined,
      successUrl: `${frontendUrl}/checkout/success?orderId=${orderId}`,
      failureUrl: `${frontendUrl}/checkout/failure?orderId=${orderId}`,
      pendingUrl: `${frontendUrl}/checkout/pending?orderId=${orderId}`,
    });

    return {
      preferenceId: result.preferenceId,
      initPoint: result.initPoint,
      orderId: orderId,
    };
  }

  async getMercadoPagoRedirectUrl(orderId: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('El pedido no está en estado PENDING_PAYMENT');
    }

    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const result = await this.paymentsService.createMercadoPagoPreference({
      orderId,
      amount: Number(order.total),
      items: order.items.map(i => ({
        id: i.productId,
        name: i.name,
        image: i.image,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
      })),
      customer: { email: order.customerEmail, name: order.customerName, phone: order.customerPhone },
      shippingAddress: order.shippingAddress ? {
        province: order.shippingAddress.province,
        city: order.shippingAddress.city,
        postalCode: order.shippingAddress.postalCode,
        address: order.shippingAddress.address,
        number: order.shippingAddress.number,
      } : undefined,
      successUrl: `${frontendUrl}/checkout/success?orderId=${orderId}`,
      failureUrl: `${frontendUrl}/checkout/failure?orderId=${orderId}`,
      pendingUrl: `${frontendUrl}/checkout/pending?orderId=${orderId}`,
    });

    return { url: result.initPoint, preferenceId: result.preferenceId };
  }

  async updateStatus(orderId: string, dto: UpdateOrderStatusDto) {
    const order = await this.getOrderDetail(orderId);
    const target = dto.status;

    const allowed: Record<string, OrderStatus[]> = {
      [OrderStatus.PROCESSING]: [OrderStatus.PAYMENT_APPROVED],
      [OrderStatus.SHIPPED]: [OrderStatus.PAYMENT_APPROVED, OrderStatus.PROCESSING],
      [OrderStatus.DELIVERED]: [OrderStatus.SHIPPED],
      [OrderStatus.CANCELLED]: [
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.PAYMENT_APPROVED,
        OrderStatus.PROCESSING,
        OrderStatus.SHIPPED,
      ],
    };

    const current = order.status;
    if (current === target) throw new BadRequestException('El pedido ya tiene ese estado');

    if (!allowed[target]?.includes(current)) {
      throw new BadRequestException(
        `No se puede pasar de ${current} a ${target}`,
      );
    }

    if (target === OrderStatus.CANCELLED) {
      await this.cancelOrder(order);
      return this.getOrderDetail(orderId);
    }

    if (target === OrderStatus.SHIPPED) {
      const shipment = await this.shipmentsService.createForOrder(order);
      await this.notificationsService.createForOrderCustomer(
        order,
        NotificationType.SHIPMENT_STATUS,
        'Tu pedido fue enviado',
        `Tu pedido ${order.orderNumber} fue despachado. Código de seguimiento: ${shipment.trackingNumber}`,
        `/pedidos/${order.id}`,
      );
      await this.mailService.sendShipmentStatus(order.customerEmail, order.orderNumber, shipment.trackingNumber);
    }

    if (target === OrderStatus.DELIVERED) {
      const shipment = await this.shipmentsService.findByOrder(order.id);
      if (shipment && shipment.status !== 'DELIVERED') {
        while (shipment.status !== 'DELIVERED') {
          await this.shipmentsService.advance(shipment.id);
          shipment.status = (await this.shipmentsService.findOne(shipment.id)).status;
        }
      }
      await this.notificationsService.createForOrderCustomer(
        order,
        NotificationType.SHIPMENT_STATUS,
        'Pedido entregado',
        `Tu pedido ${order.orderNumber} fue entregado. ¡Gracias por comprar en TOROX!`,
        `/pedidos/${order.id}`,
      );
      await this.mailService.sendOrderDelivered(order.customerEmail, order.orderNumber);
    }

    order.status = target;
    await this.orderRepo.save(order);
    return this.getOrderDetail(orderId);
  }

  private async handlePaymentApproved(orderId: string, payment: Payment) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Pedido no encontrado');

    order.status = OrderStatus.PAYMENT_APPROVED;
    await this.orderRepo.save(order);

    await this.shipmentsService.createForOrder(order);

    await this.financeService.recordIncome(
      `Venta ${order.orderNumber} — ${order.customerName}`,
      Number(order.total),
      order.id,
      new Date(),
    );

    await this.notificationsService.createForOrderCustomer(
      order,
      NotificationType.ORDER_STATUS,
      'Tu pago fue aprobado',
      `El pago de tu pedido ${order.orderNumber} fue aprobado por $${Number(order.total).toLocaleString('es-AR')}. ¡Ya lo estamos preparando!`,
      `/pedidos/${order.id}`,
    );
    await this.notificationsService.createForOrderCustomer(
      order,
      NotificationType.SHIPMENT_STATUS,
      'Envío generado',
      'Tu envío fue generado en Andreani y está en preparación.',
      `/pedidos/${order.id}`,
    );
    await this.mailService.sendPaymentApproved(order.customerEmail, order.orderNumber, order.total);
    await this.mailService.sendOrderConfirmation(order.customerEmail, order.orderNumber, order.total);
  }

  private async handlePaymentRejected(orderId: string, _payment: Payment, reason?: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Pedido no encontrado');

    await this.cancelOrder(order, reason);

    await this.notificationsService.createForOrderCustomer(
      order,
      NotificationType.ORDER_STATUS,
      'Pago rechazado',
      reason || 'No pudimos procesar el pago de tu pedido. Podés volver a intentarlo.',
      `/pedidos/${order.id}`,
    );
    await this.mailService.sendPaymentRejected(order.customerEmail, order.orderNumber, reason || 'Pago no procesado');
  }

  private async cancelOrder(order: Order, reason?: string) {
    order.status = OrderStatus.CANCELLED;
    if (reason) order.notes = reason;
    await this.orderRepo.save(order);

    // Restore stock.
    for (const item of order.items || []) {
      await this.productsService.restoreStock(item.productId, item.quantity);
    }

    // Register a refund if the payment had already been approved.
    const payment = await this.paymentsService.findByOrder(order.id);
    if (payment?.status === 'APPROVED') {
      await this.financeService.recordExpense({
        category: 'OTHER' as any,
        description: `Reembolso pedido ${order.orderNumber}`,
        amount: Number(order.total),
        date: new Date().toISOString(),
      });
    }
  }

  private getShippingCost(subtotal: number): number {
    return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  }

  private async nextOrderNumber(): Promise<string> {
    const orders = await this.orderRepo.find({ select: { orderNumber: true } });
    const numbers = orders
      .map((o) => parseInt(o.orderNumber.split('-').pop() || '', 10))
      .filter((n) => !Number.isNaN(n));
    const next = numbers.length ? Math.max(...numbers) + 1 : 1;
    return `TORX-${String(next).padStart(6, '0')}`;
  }
}