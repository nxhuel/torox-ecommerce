import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { MercadoPagoService } from './mercado-pago.service';
import { PaymentsService } from './payments.service';
import { OrdersService } from '../orders/orders.service';

export type MercadoPagoSyncResult =
  | 'APPROVED'
  | 'ALREADY_APPROVED'
  | 'REJECTED'
  | 'PENDING'
  | 'NOT_FOUND';

/**
 * Aplica a un pedido de TOROX el estado real de su pago en Mercado Pago.
 *
 * Lo usan dos caminos:
 *  1. El webhook de Mercado Pago (cuando MP nos avisa).
 *  2. La página /checkout/success|pending al volver de MP: le pregunta a MP
 *     por el pago del pedido y lo confirma. Así el pedido se aprueba aunque el
 *     webhook no llegue (pasa en local, donde el webhook apunta a producción,
 *     y también en producción si MP demora o falla el aviso).
 *
 * Es idempotente: llamarlo varias veces no aprueba dos veces ni genera dos guías.
 */
@Injectable()
export class MercadoPagoSyncService {
  private readonly logger = new Logger(MercadoPagoSyncService.name);

  constructor(
    private readonly mercadoPago: MercadoPagoService,
    private readonly payments: PaymentsService,
    @Inject(forwardRef(() => OrdersService))
    private readonly orders: OrdersService,
  ) {}

  /** Busca en Mercado Pago el pago del pedido (por external_reference) y lo aplica. */
  async confirmOrder(orderId: string): Promise<MercadoPagoSyncResult> {
    const results: any[] = await this.mercadoPago.getPaymentByOrderId(orderId);
    if (!results.length) return 'NOT_FOUND';

    // Si hay varios intentos (ej: una tarjeta rechazada y después otra
    // aprobada), manda el aprobado; si no, el más reciente.
    const approved = results.find((p) => p.status === 'approved');
    const latest = [...results].sort(
      (a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime(),
    )[0];
    return this.applyPayment(orderId, approved ?? latest);
  }

  /** Aplica un pago de Mercado Pago (ya obtenido) al pedido. */
  async applyPayment(orderId: string, mpPayment: any): Promise<MercadoPagoSyncResult> {
    const payment = await this.payments.findByOrder(orderId);
    if (!payment) {
      this.logger.warn(`No se encontró pago en TOROX para el pedido ${orderId}`);
      return 'NOT_FOUND';
    }
    if (payment.status === 'APPROVED') return 'ALREADY_APPROVED';

    const mpStatus = mpPayment?.status;
    this.logger.log(`Pedido ${orderId}: pago MP ${mpPayment?.id} en estado "${mpStatus}"`);

    if (mpStatus === 'approved') {
      // Control de seguridad: el monto cobrado tiene que cubrir el total del
      // pedido. Si no (ej: preferencia vieja sin el envío), no se aprueba solo:
      // queda pendiente para que el admin lo revise.
      const order = await this.orders.getOrderDetail(orderId);
      const paid = Number(mpPayment.transaction_amount ?? 0);
      const total = Number(order.total ?? 0);
      if (paid + 0.01 < total) {
        this.logger.error(
          `Pedido ${orderId}: MP cobró $${paid} pero el total es $${total}. No se aprueba automáticamente.`,
        );
        return 'PENDING';
      }
      // approvePayment marca el pedido como pagado, descuenta stock, avisa
      // por mail y genera la guía de Envia automáticamente.
      await this.orders.approvePayment(orderId);
      this.logger.log(`Pedido ${orderId} aprobado (pago MP ${mpPayment.id})`);
      return 'APPROVED';
    }
    if (mpStatus === 'rejected' || mpStatus === 'cancelled') {
      await this.payments.reject(payment.id, 'Pago rechazado por Mercado Pago');
      return 'REJECTED';
    }
    return 'PENDING';
  }
}
