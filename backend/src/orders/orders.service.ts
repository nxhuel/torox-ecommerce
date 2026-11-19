import { Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  Order,
  OrderItem,
  OrderStatus,
  ShippingMethod,
  ShippingOptionSnapshot,
  ShippingBranchSnapshot,
  ShippingOriginSnapshot,
} from './entities/order.entity';
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


@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

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

    // Validate products, variants and stock.
    const lineMap = new Map<string, { product: any; variant: any | null }>();
    for (const item of cart.items) {
      const product = await this.productsService.findOne(item.productId);
      if (!product.isActive) {
        throw new BadRequestException(`"${product.name}" no está disponible`);
      }

      const variants = product.variants || [];
      const variant = item.variantId
        ? variants.find((v: any) => v.id === item.variantId)
        : null;

      if (variants.length && !variant) {
        throw new BadRequestException(`Elegí una variante de "${product.name}"`);
      }
      if (variant && !variant.isActive) {
        throw new BadRequestException(`La variante "${variant.name}" de "${product.name}" no está disponible`);
      }

      const available = variant ? variant.stock : product.stock;
      if (available < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para "${product.name}${variant ? ` - ${variant.name}` : ''}". Disponible: ${available}`,
        );
      }
      lineMap.set(item.id, { product, variant });
    }

    const subtotal = cart.items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0,
    );
    const lineProductIds = cart.items.map((i) => i.productId);
    const lineCategoryIds = [
      ...new Set(cart.items.map((i) => lineMap.get(i.id)?.product?.categoryId).filter(Boolean)),
    ];

    // Product prices already include active promotions (see ProductsService).
    // El envío NO es gratis: el comprador paga el costo real de Envia.com,
    // por eso la promoción de "envío gratis" no altera el total.
    await this.promotionsService.applyPromotions(
      subtotal,
      lineCategoryIds,
      lineProductIds,
    );
    const discount = 0;

    // ─── Envío ────────────────────────────────────────────────────────────────
    // Retiro en el local de TOROX: no hay envío ni guía que generar.
    // Cualquier otro caso: el comprador elige entre las opciones de Envia.com
    // y el precio es siempre el real que devuelve la API.
    let shippingCost = 0;
    let shippingMethod = dto.shippingMethod;
    let shippingOption: ShippingOptionSnapshot | null = null;
    let shippingBranch: ShippingBranchSnapshot | null = null;
    let shippingOrigin: ShippingOriginSnapshot | null = null;

    if (dto.shippingMethod === ShippingMethod.PICKUP) {
      shippingMethod = ShippingMethod.PICKUP;
    } else {
      const resolved = await this.shipmentsService.resolveShippingOption({
        province: dto.shippingAddress.province,
        city: dto.shippingAddress.city,
        postalCode: dto.shippingAddress.postalCode,
        address: dto.shippingAddress.address,
        number: dto.shippingAddress.number,
        items: cart.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
        optionId: dto.shippingOptionId,
        branchCode: dto.shippingBranchCode,
        branchCarrier: dto.shippingBranchCarrier,
      });

      const { option, branch, origin, originBranch } = resolved;
      shippingCost = option.cost;
      shippingMethod =
        option.deliveryMode === 'BRANCH'
          ? ShippingMethod.BRANCH_PICKUP
          : ShippingMethod.HOME_DELIVERY;
      shippingOption = {
        id: option.id,
        carrier: option.carrier,
        carrierName: option.carrierName,
        service: option.service,
        serviceDescription: option.serviceDescription,
        dropOff: option.dropOff,
        dropOffDescription: option.dropOffDescription,
        deliveryMode: option.deliveryMode,
        pickupMode: option.pickupMode,
        cost: option.cost,
        currency: option.currency,
        deliveryEstimate: option.deliveryEstimate,
        deliveryDate: option.deliveryDate,
      };
      // El origen queda congelado: la etiqueta sale desde la misma sucursal
      // con la que se cotizó, aunque el admin después cambie el origen.
      shippingOrigin = {
        carrier: option.carrier,
        branchCode: origin.branchCode ?? null,
        reference: originBranch?.reference ?? null,
        address: {
          name: origin.name,
          company: origin.company,
          email: origin.email,
          phone: origin.phone,
          street: origin.street,
          number: origin.number,
          city: origin.city,
          state: origin.state,
          country: origin.country,
          postalCode: origin.postalCode,
        },
      };
      shippingBranch = branch
        ? {
            branchCode: branch.branchCode,
            branchId: branch.branchId,
            carrier: branch.carrier,
            carrierName: branch.carrierName,
            reference: branch.reference,
            type: branch.type,
            address: branch.address,
            distanceKm: branch.distanceKm,
            phone: branch.phone,
            hours: branch.hours,
          }
        : null;
    }

    const total = subtotal - discount + shippingCost;

    const order = this.orderRepo.create({
      orderNumber: await this.nextOrderNumber(),
      userId,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      shippingAddress: dto.shippingAddress,
      shippingMethod,
      shippingOption,
      shippingBranch,
      shippingOrigin,
      subtotal,
      discount,
      shippingCost,
      total,
      status: OrderStatus.PENDING_PAYMENT,
      notes: dto.notes,
      items: cart.items.map((item) => {
        const { product, variant } = lineMap.get(item.id)!;
        return this.itemRepo.create({
          productId: item.productId,
          variantId: variant?.id ?? null,
          variantName: variant?.name ?? null,
          name: product.name,
          sku: variant?.sku || product.sku,
          image: variant?.images?.[0] || product.images?.[0],
          unitPrice: Number(item.unitPrice),
          quantity: item.quantity,
          subtotal: Number(item.unitPrice) * item.quantity,
        });
      }),
    });

    const saved = await this.orderRepo.save(order);

    // Decrease stock and clear the cart.
    for (const item of cart.items) {
      await this.productsService.decreaseStock(item.productId, item.quantity, item.variantId ?? undefined);
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

    const packageDetails = shipment ? await this.shipmentsService.getPackageDetails(order) : null
    return { ...order, payment, shipment, packageDetails };
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
        name: i.variantName ? `${i.name} - ${i.variantName}` : i.name,
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
        name: i.variantName ? `${i.name} - ${i.variantName}` : i.name,
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
      if (shipment) {
        await this.notificationsService.createForOrderCustomer(
          order,
          NotificationType.SHIPMENT_STATUS,
          'Tu pedido fue enviado',
          `Tu pedido ${order.orderNumber} fue despachado. Código de seguimiento: ${shipment.trackingNumber}`,
          `/pedidos/${order.id}`,
        );
        await this.mailService.sendShipmentStatus(order.customerEmail, order.orderNumber, shipment.trackingNumber);
      }
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
    // Los items son necesarios: con ellos se calcula el peso, las medidas y el
    // valor declarado del paquete. Sin la relación, la guía salía siempre con
    // el paquete por defecto (0,5 kg) y valor declarado $0.
    const order = await this.orderRepo.findOne({ where: { id: orderId }, relations: { items: true } });
    if (!order) throw new NotFoundException('Pedido no encontrado');

    order.status = OrderStatus.PAYMENT_APPROVED;
    await this.orderRepo.save(order);

    // Generamos la guía en Envia.com. Si la API falla, el pedido queda pagos y
    // el admin puede reintentar la generación desde el detalle del pedido.
    try {
      await this.shipmentsService.createForOrder(order);
    } catch (error: any) {
      this.logger.error(
        `No se pudo generar la guía de Envia para el pedido ${order.orderNumber}: ${error?.message}`,
      );
    }

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
      'Tu envío fue generado y está en preparación.',
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
      await this.productsService.restoreStock(item.productId, item.quantity, item.variantId ?? undefined);
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

  private async nextOrderNumber(): Promise<string> {
    const orders = await this.orderRepo.find({ select: { orderNumber: true } });
    const numbers = orders
      .map((o) => parseInt(o.orderNumber.split('-').pop() || '', 10))
      .filter((n) => !Number.isNaN(n));
    const next = numbers.length ? Math.max(...numbers) + 1 : 1;
    return `TORX-${String(next).padStart(6, '0')}`;
  }
}