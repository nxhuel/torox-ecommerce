import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { Product } from '../../products/entities/product.entity';
import { Order, OrderItem, OrderStatus, ShippingMethod } from '../../orders/entities/order.entity';
import { Payment, PaymentMethod, PaymentStatus } from '../../payments/entities/payment.entity';
import { Shipment, ShipmentStatus } from '../../shipments/entities/shipment.entity';
import { Notification, NotificationType } from '../../notifications/entities/notification.entity';
import { Promotion, PromotionType } from '../../promotions/entities/promotion.entity';
import { FinanceMovement, MovementType, MovementCategory } from '../../finance/entities/finance-movement.entity';
import {
  SEED_CATEGORIES,
  SEED_PRODUCTS,
  SEED_CUSTOMERS,
  CUSTOMER_PASSWORD,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  PROVINCES,
} from './seed-data';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Seed');

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Category) private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private readonly itemRepo: Repository<OrderItem>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Shipment) private readonly shipmentRepo: Repository<Shipment>,
    @InjectRepository(Notification) private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(Promotion) private readonly promotionRepo: Repository<Promotion>,
    @InjectRepository(FinanceMovement) private readonly financeRepo: Repository<FinanceMovement>,
  ) {}

  async onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test') return;
    try {
      const count = await this.productRepo.count();
      if (count > 0) {
        this.logger.log('Base de datos ya contiene datos. Se saltea el seed.');
        return;
      }
      this.logger.log('Iniciando seed de datos demo...');
      await this.run();
      this.logger.log('✅ Seed completado: usuarios, categorías, productos, pedidos, pagos, envíos, promociones, notificaciones y finanzas.');
    } catch (error) {
      this.logger.error(`Error durante el seed: ${(error as Error).message}`);
    }
  }

  private async run() {
    const users = await this.seedUsers();
    const categories = await this.seedCategories();
    const products = await this.seedProducts(categories);
    await this.seedPromotions();
    await this.seedOrders(users, products);
    await this.seedNotifications(users);
    await this.seedFinanceExpenses();
  }

  private async seedUsers(): Promise<User[]> {
    const hash = (password: string) => bcrypt.hash(password, 12);

    const admin = this.userRepo.create({
      email: ADMIN_EMAIL,
      password: await hash(ADMIN_PASSWORD),
      firstName: 'Torox',
      lastName: 'Admin',
      phone: '+54 11 5555-0000',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });

    const customers = await Promise.all(
      SEED_CUSTOMERS.map(async (c, i) =>
        this.userRepo.create({
          ...c,
          password: await hash(CUSTOMER_PASSWORD),
          role: UserRole.CUSTOMER,
          status: UserStatus.ACTIVE,
          createdAt: this.monthsAgo(6 - (i % 6)),
        }),
      ),
    );

    return this.userRepo.save([admin, ...customers]);
  }

  private async seedCategories(): Promise<Map<string, Category>> {
    const map = new Map<string, Category>();
    for (const cat of SEED_CATEGORIES) {
      const parent = await this.categoryRepo.save(
        this.categoryRepo.create({
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          imageUrl: cat.imageUrl,
          sortOrder: cat.sortOrder,
          isActive: true,
        }),
      );
      map.set(cat.slug, parent);

      for (const child of cat.children || []) {
        const sub = await this.categoryRepo.save(
          this.categoryRepo.create({
            name: child.name,
            slug: child.slug,
            description: child.description,
            parentId: parent.id,
            isActive: true,
          }),
        );
        map.set(child.slug, sub);
      }
    }
    return map;
  }

  private async seedProducts(categories: Map<string, Category>): Promise<Product[]> {
    const products = SEED_PRODUCTS.map((p) =>
      this.productRepo.create({
        name: p.name,
        slug: p.slug,
        description: p.description,
        shortDescription: p.shortDescription,
        categoryId: categories.get(p.categorySlug)!.id,
        brand: p.brand,
        sku: `TORX-${p.slug.toUpperCase().replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
        price: p.price,
        originalPrice: p.originalPrice,
        cost: p.cost,
        stock: p.stock,
        images: p.images,
        specifications: p.specifications,
        isFeatured: p.isFeatured || false,
        isOnSale: p.isOnSale || false,
        discountPercentage: p.discountPercentage,
        isActive: true,
      }),
    );
    return this.productRepo.save(products);
  }

  private async seedPromotions(): Promise<Promotion[]> {
    const now = new Date();
    const inDays = (days: number) => new Date(now.getTime() + days * 86400000);
    const daysAgo = (days: number) => new Date(now.getTime() - days * 86400000);

    const camaras = await this.categoryRepo.findOne({ where: { slug: 'camaras' } });
    const sensorMovimiento = await this.productRepo.findOne({ where: { slug: 'sensor-movimiento-pir-ajax' } });

    const promotions = [
      this.promotionRepo.create({
        name: 'Envío gratis en compras superiores a $50.000',
        description: 'Aprovechá el envío gratis a todo el país en compras mayores a $50.000.',
        type: PromotionType.FREE_SHIPPING,
        value: 50000,
        startDate: daysAgo(10),
        endDate: inDays(20),
        productIds: [],
        categoryIds: [],
        isActive: true,
      }),
      this.promotionRepo.create({
        name: '20% OFF en cámaras',
        description: '20% de descuento en todos los productos de la categoría Cámaras.',
        type: PromotionType.PERCENTAGE_DISCOUNT,
        value: 20,
        startDate: daysAgo(5),
        endDate: inDays(15),
        productIds: [],
        categoryIds: camaras ? [camaras.id] : [],
        isActive: true,
      }),
      this.promotionRepo.create({
        name: 'Oferta especial: Sensor de movimiento',
        description: '$5.000 de descuento en el sensor de movimiento Ajax.',
        type: PromotionType.SPECIAL_OFFER,
        value: 5000,
        startDate: daysAgo(3),
        endDate: inDays(10),
        productIds: sensorMovimiento ? [sensorMovimiento.id] : [],
        categoryIds: [],
        isActive: true,
      }),
      this.promotionRepo.create({
        name: 'Hot Sale — 10% OFF',
        description: 'Promoción finalizada del Hot Sale.',
        type: PromotionType.PERCENTAGE_DISCOUNT,
        value: 10,
        startDate: daysAgo(40),
        endDate: daysAgo(33),
        productIds: [],
        categoryIds: [],
        isActive: false,
      }),
    ];

    return this.promotionRepo.save(promotions);
  }

  private async seedOrders(
    users: User[],
    products: Product[],
  ) {
    const bySlug = new Map(products.map((p) => [p.slug, p]));
    const get = (slug: string) => bySlug.get(slug)!;

    const specs = [
      {
        customerIndex: 1,
        items: [{ slug: 'kit-cctv-4-camaras-1080p-dahua', qty: 1 }, { slug: 'soporte-pared-camara', qty: 2 }],
        status: OrderStatus.DELIVERED,
        createdAt: this.monthsAgo(4),
        paymentMethod: PaymentMethod.CREDIT_CARD,
        paymentStatus: PaymentStatus.APPROVED,
        shipmentStatus: ShipmentStatus.DELIVERED,
      },
      {
        customerIndex: 2,
        items: [{ slug: 'camara-ip-wifi-2k-hikvision', qty: 2 }],
        status: OrderStatus.DELIVERED,
        createdAt: this.monthsAgo(3.5),
        paymentMethod: PaymentMethod.DEBIT_CARD,
        paymentStatus: PaymentStatus.APPROVED,
        shipmentStatus: ShipmentStatus.DELIVERED,
      },
      {
        customerIndex: 3,
        items: [{ slug: 'sistema-alarma-inalambrico-ajax', qty: 1 }, { slug: 'sensor-movimiento-pir-ajax', qty: 3 }],
        status: OrderStatus.DELIVERED,
        createdAt: this.monthsAgo(3),
        paymentMethod: PaymentMethod.CREDIT_CARD,
        paymentStatus: PaymentStatus.APPROVED,
        shipmentStatus: ShipmentStatus.DELIVERED,
      },
      {
        customerIndex: 4,
        items: [{ slug: 'cerradura-inteligente-huella-yale', qty: 1 }],
        status: OrderStatus.DELIVERED,
        createdAt: this.monthsAgo(2.4),
        paymentMethod: PaymentMethod.CREDIT_CARD,
        paymentStatus: PaymentStatus.APPROVED,
        shipmentStatus: ShipmentStatus.DELIVERED,
      },
      {
        customerIndex: 5,
        items: [{ slug: 'videoportero-ip-tactil-dahua', qty: 1 }, { slug: 'cable-utp-cat6-305m', qty: 1 }],
        status: OrderStatus.DELIVERED,
        createdAt: this.monthsAgo(1.8),
        paymentMethod: PaymentMethod.DEBIT_CARD,
        paymentStatus: PaymentStatus.APPROVED,
        shipmentStatus: ShipmentStatus.DELIVERED,
      },
      {
        customerIndex: 6,
        items: [{ slug: 'control-acceso-biometrico-zkteco', qty: 1 }],
        status: OrderStatus.DELIVERED,
        createdAt: this.monthsAgo(1.2),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        paymentStatus: PaymentStatus.APPROVED,
        shipmentStatus: ShipmentStatus.DELIVERED,
      },
      {
        customerIndex: 7,
        items: [{ slug: 'camara-inalambrica-bateria-ezviz', qty: 1 }, { slug: 'sensor-apertura-ajax', qty: 2 }],
        status: OrderStatus.DELIVERED,
        createdAt: this.monthsAgo(0.7),
        paymentMethod: PaymentMethod.CREDIT_CARD,
        paymentStatus: PaymentStatus.APPROVED,
        shipmentStatus: ShipmentStatus.DELIVERED,
      },
      {
        customerIndex: 0,
        items: [{ slug: 'camara-ip-wifi-2k-hikvision', qty: 1 }, { slug: 'sensor-movimiento-pir-ajax', qty: 2 }],
        status: OrderStatus.SHIPPED,
        createdAt: this.daysAgo(12),
        paymentMethod: PaymentMethod.CREDIT_CARD,
        paymentStatus: PaymentStatus.APPROVED,
        shipmentStatus: ShipmentStatus.OUT_FOR_DELIVERY,
      },
      {
        customerIndex: 1,
        items: [{ slug: 'camara-exterior-ptz-4mp-dahua', qty: 1 }],
        status: OrderStatus.SHIPPED,
        createdAt: this.daysAgo(8),
        paymentMethod: PaymentMethod.CREDIT_CARD,
        paymentStatus: PaymentStatus.APPROVED,
        shipmentStatus: ShipmentStatus.IN_TRANSIT,
      },
      {
        customerIndex: 2,
        items: [{ slug: 'cerradura-smart-wifi-xiaomi', qty: 1 }, { slug: 'sensor-apertura-ajax', qty: 1 }],
        status: OrderStatus.PROCESSING,
        createdAt: this.daysAgo(5),
        paymentMethod: PaymentMethod.DEBIT_CARD,
        paymentStatus: PaymentStatus.APPROVED,
        shipmentStatus: ShipmentStatus.PREPARING,
      },
      {
        customerIndex: 3,
        items: [{ slug: 'videoportero-wifi-hikvision', qty: 1 }],
        status: OrderStatus.PAYMENT_APPROVED,
        createdAt: this.daysAgo(3),
        paymentMethod: PaymentMethod.CREDIT_CARD,
        paymentStatus: PaymentStatus.APPROVED,
        shipmentStatus: ShipmentStatus.PREPARING,
      },
      {
        customerIndex: 4,
        items: [{ slug: 'alarma-gsm-hogar-smanos', qty: 1 }],
        status: OrderStatus.PENDING_PAYMENT,
        createdAt: this.daysAgo(2),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        paymentStatus: PaymentStatus.PENDING,
        hasShipment: false,
      },
      {
        customerIndex: 5,
        items: [{ slug: 'camara-interior-full-hd-tp-link', qty: 2 }, { slug: 'soporte-pared-camara', qty: 1 }],
        status: OrderStatus.PENDING_PAYMENT,
        createdAt: this.daysAgo(1),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        paymentStatus: PaymentStatus.PENDING,
        hasShipment: false,
      },
      {
        customerIndex: 6,
        items: [{ slug: 'pack-2-sensores-movimiento-smanos', qty: 1 }],
        status: OrderStatus.CANCELLED,
        createdAt: this.daysAgo(15),
        paymentMethod: PaymentMethod.CREDIT_CARD,
        paymentStatus: PaymentStatus.REJECTED,
        hasShipment: false,
      },
    ];

    const priceOf = (product: Product) =>
      product.isOnSale && product.discountPercentage
        ? Number(product.price) * (1 - Number(product.discountPercentage) / 100)
        : Number(product.price);

    let orderNumber = 1;
    for (const spec of specs) {
      const customer = users[spec.customerIndex + 1];
      const items = spec.items.map((i) => ({
        product: get(i.slug),
        qty: i.qty,
      }));

      const subtotal = items.reduce((s, i) => s + priceOf(i.product) * i.qty, 0);
      const shippingCost = subtotal >= 50000 ? 0 : 3500;
      const discount = 0;
      const total = subtotal - discount + shippingCost;

      const order = await this.orderRepo.save(
        this.orderRepo.create({
          orderNumber: `TORX-${String(orderNumber++).padStart(6, '0')}`,
          userId: customer.id,
          customerName: customer.fullName,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          shippingAddress: {
            province: PROVINCES[orderNumber % PROVINCES.length],
            city: 'CABA',
            postalCode: String(1000 + (orderNumber % 9000)),
            address: ['Av. Rivadavia', 'Calle Corrientes', 'Av. San Martín', 'Calle Mitre', 'Av. Colón'][orderNumber % 5],
            number: String(100 + orderNumber * 7),
            apartment: orderNumber % 3 === 0 ? `${orderNumber % 10}°B` : undefined,
            references: 'Casa con reja negra',
          },
          shippingMethod: ShippingMethod.HOME_DELIVERY,
          subtotal,
          discount,
          shippingCost,
          total,
          status: spec.status,
          createdAt: spec.createdAt,
          items: items.map((i) =>
            this.itemRepo.create({
              productId: i.product.id,
              name: i.product.name,
              sku: i.product.sku,
              image: i.product.images?.[0],
              unitPrice: priceOf(i.product),
              quantity: i.qty,
              subtotal: priceOf(i.product) * i.qty,
            }),
          ),
        }),
      );

      await this.paymentRepo.save(
        this.paymentRepo.create({
          orderId: order.id,
          method: spec.paymentMethod,
          status: spec.paymentStatus,
          amount: total,
          reference: `${spec.paymentMethod === PaymentMethod.BANK_TRANSFER ? 'TRF' : 'MP'}-DEMO-${String(orderNumber).padStart(6, '0')}`,
          cardBrand: spec.paymentMethod === PaymentMethod.BANK_TRANSFER ? undefined : ['VISA', 'MASTERCARD'][orderNumber % 2],
          lastFour: spec.paymentMethod === PaymentMethod.BANK_TRANSFER ? undefined : String(1000 + orderNumber * 321).slice(-4),
          approvedAt: spec.paymentStatus === PaymentStatus.APPROVED ? spec.createdAt : undefined,
          message: spec.paymentStatus === PaymentStatus.APPROVED ? 'Pago aprobado correctamente.' : spec.paymentStatus === PaymentStatus.PENDING ? 'Transferencia recibida. Pago pendiente de confirmación.' : 'La operación fue rechazada por el emisor.',
          createdAt: spec.createdAt,
        }),
      );

      if (spec.hasShipment !== false) {
        const events = this.buildShipmentEvents(spec.shipmentStatus!, spec.createdAt);
        await this.shipmentRepo.save(
          this.shipmentRepo.create({
            orderId: order.id,
            trackingNumber: `TORX-AND-${String(100000 + orderNumber * 741).slice(0, 6)}`,
            carrier: 'ANDREANI (SIMULADO)',
            status: spec.shipmentStatus,
            estimatedDelivery: this.daysFrom(spec.createdAt, 5),
            events,
            shippedAt: spec.shipmentStatus !== ShipmentStatus.PREPARING ? this.daysFrom(spec.createdAt, 1) : undefined,
            deliveredAt: spec.shipmentStatus === ShipmentStatus.DELIVERED ? this.daysFrom(spec.createdAt, 4) : undefined,
            createdAt: spec.createdAt,
          }),
        );
      }

      // Financial income for revenue orders.
      if (spec.paymentStatus === PaymentStatus.APPROVED) {
        await this.financeRepo.save(
          this.financeRepo.create({
            type: MovementType.INCOME,
            category: MovementCategory.SALE,
            description: `Venta ${order.orderNumber} — ${customer.fullName}`,
            amount: total,
            date: spec.createdAt,
            referenceId: order.id,
          }),
        );
      }

      // Status notifications for the customer.
      const notifications = [];
      notifications.push(
        this.notificationRepo.create({
          userId: customer.id,
          type: NotificationType.ORDER_STATUS,
          title: `Pedido ${order.orderNumber} creado`,
          message: `Tu pedido ${order.orderNumber} fue registrado correctamente.`,
          link: `/pedidos/${order.id}`,
          createdAt: spec.createdAt,
        }),
      );
      if (spec.paymentStatus === PaymentStatus.APPROVED) {
        notifications.push(
          this.notificationRepo.create({
            userId: customer.id,
            type: NotificationType.ORDER_STATUS,
            title: 'Tu pago fue aprobado',
            message: `El pago de tu pedido ${order.orderNumber} fue aprobado. ¡Ya lo estamos preparando!`,
            link: `/pedidos/${order.id}`,
            createdAt: this.daysFrom(spec.createdAt, 0.2),
          }),
        );
      }
      if (spec.shipmentStatus === ShipmentStatus.OUT_FOR_DELIVERY || spec.shipmentStatus === ShipmentStatus.IN_TRANSIT || spec.shipmentStatus === ShipmentStatus.DELIVERED) {
        notifications.push(
          this.notificationRepo.create({
            userId: customer.id,
            type: NotificationType.SHIPMENT_STATUS,
            title: 'Tu pedido fue enviado',
            message: `Tu pedido ${order.orderNumber} está en camino. Seguilo con el código de tracking.`,
            link: `/pedidos/${order.id}`,
            createdAt: this.daysFrom(spec.createdAt, 1.5),
          }),
        );
      }
      if (spec.shipmentStatus === ShipmentStatus.DELIVERED) {
        notifications.push(
          this.notificationRepo.create({
            userId: customer.id,
            type: NotificationType.SHIPMENT_STATUS,
            title: 'Pedido entregado',
            message: `Tu pedido ${order.orderNumber} fue entregado. ¡Gracias por comprar en TOROX!`,
            link: `/pedidos/${order.id}`,
            createdAt: this.daysFrom(spec.createdAt, 4),
          }),
        );
      }
      if (spec.paymentStatus === PaymentStatus.REJECTED) {
        notifications.push(
          this.notificationRepo.create({
            userId: customer.id,
            type: NotificationType.ORDER_STATUS,
            title: 'Pago rechazado',
            message: `No pudimos procesar el pago de tu pedido ${order.orderNumber}. Podés volver a intentarlo.`,
            link: `/pedidos/${order.id}`,
            createdAt: this.daysFrom(spec.createdAt, 0.3),
          }),
        );
      }
      await this.notificationRepo.save(notifications);
    }
  }

  private async seedNotifications(users: User[]) {
    const notifications = users.slice(1).map((user, i) =>
      this.notificationRepo.create({
        userId: user.id,
        type: NotificationType.SYSTEM,
        title: '¡Bienvenido a TOROX!',
        message: 'Tu cuenta fue creada correctamente. Ya podés guardar favoritos, seguir tus pedidos y recibir ofertas.',
        createdAt: this.monthsAgo(4 - (i % 4)),
      }),
    );

    notifications.push(
      ...users.slice(1, 4).map((user) =>
        this.notificationRepo.create({
          userId: user.id,
          type: NotificationType.PROMOTION,
          title: '¡Nueva promoción disponible!',
          message: 'Aprovechá el envío gratis en compras superiores a $50.000 hasta fin de mes.',
          link: '/productos',
          createdAt: this.daysAgo(2),
        }),
      ),
    );

    await this.notificationRepo.save(notifications);
    this.logger.log(`Creadas ${notifications.length + 20} notificaciones demo`);
  }

  private async seedFinanceExpenses() {
    const expenses = [
      { description: 'Compra de mercadería — Hikvision', category: MovementCategory.MERCHANDISE, amount: 260000, monthsAgo: 4.2 },
      { description: 'Publicidad Google Ads', category: MovementCategory.ADVERTISING, amount: 30000, monthsAgo: 4 },
      { description: 'Logística y envíos', category: MovementCategory.LOGISTICS, amount: 22000, monthsAgo: 4 },
      { description: 'Compra de mercadería — Dahua', category: MovementCategory.MERCHANDISE, amount: 230000, monthsAgo: 3.1 },
      { description: 'Publicidad Meta Ads', category: MovementCategory.ADVERTISING, amount: 35000, monthsAgo: 3 },
      { description: 'Sueldos y cargas sociales', category: MovementCategory.SALARY, amount: 180000, monthsAgo: 3 },
      { description: 'Compra de mercadería — Ajax', category: MovementCategory.MERCHANDISE, amount: 140000, monthsAgo: 2.3 },
      { description: 'Logística y envíos', category: MovementCategory.LOGISTICS, amount: 24000, monthsAgo: 2 },
      { description: 'Publicidad Google Ads', category: MovementCategory.ADVERTISING, amount: 32000, monthsAgo: 2 },
      { description: 'Sueldos y cargas sociales', category: MovementCategory.SALARY, amount: 180000, monthsAgo: 2 },
      { description: 'Compra de mercadería — TP-Link', category: MovementCategory.MERCHANDISE, amount: 90000, monthsAgo: 1.4 },
      { description: 'Publicidad Meta Ads', category: MovementCategory.ADVERTISING, amount: 38000, monthsAgo: 1 },
      { description: 'Logística y envíos', category: MovementCategory.LOGISTICS, amount: 26000, monthsAgo: 1 },
      { description: 'Sueldos y cargas sociales', category: MovementCategory.SALARY, amount: 190000, monthsAgo: 1 },
      { description: 'Compra de mercadería — Yale', category: MovementCategory.MERCHANDISE, amount: 80000, monthsAgo: 0.4 },
      { description: 'Publicidad Google Ads', category: MovementCategory.ADVERTISING, amount: 25000, monthsAgo: 0.2 },
    ];

    const movements = expenses.map((e) =>
      this.financeRepo.create({
        type: MovementType.EXPENSE,
        category: e.category,
        description: e.description,
        amount: e.amount,
        date: this.monthsAgo(e.monthsAgo),
      }),
    );

    await this.financeRepo.save(movements);
  }

  private buildShipmentEvents(
    finalStatus: ShipmentStatus,
    start: Date,
  ): { status: ShipmentStatus; date: Date; description: string }[] {
    const flow: ShipmentStatus[] = [
      ShipmentStatus.PREPARING,
      ShipmentStatus.PICKED_UP,
      ShipmentStatus.IN_TRANSIT,
      ShipmentStatus.OUT_FOR_DELIVERY,
      ShipmentStatus.DELIVERED,
    ];
    const descriptions: Record<ShipmentStatus, string> = {
      [ShipmentStatus.PREPARING]: 'Envío generado correctamente en el sistema de Andreani.',
      [ShipmentStatus.PICKED_UP]: 'El paquete fue retirado por Andreani.',
      [ShipmentStatus.IN_TRANSIT]: 'El paquete está viajando hacia su destino.',
      [ShipmentStatus.OUT_FOR_DELIVERY]: 'El paquete está en el reparto, cerca tuyo.',
      [ShipmentStatus.DELIVERED]: 'El paquete fue entregado correctamente.',
    };
    const events = [];
    const endIndex = flow.indexOf(finalStatus);
    for (let i = 0; i <= endIndex; i++) {
      events.push({
        status: flow[i],
        date: this.daysFrom(start, i * 0.9),
        description: descriptions[flow[i]],
      });
    }
    return events;
  }

  private monthsAgo(n: number): Date {
    const d = new Date();
    d.setMonth(d.getMonth() - n);
    d.setHours(10 + (n % 8), 15, 0, 0);
    return d;
  }

  private daysAgo(n: number): Date {
    return this.daysFrom(new Date(), -n);
  }

  private daysFrom(date: Date, n: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    d.setHours(10 + (n % 6), 30, 0, 0);
    return d;
  }
}