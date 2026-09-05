import { Injectable } from '@nestjs/common';
import {
  PaymentProvider,
  ProcessPaymentInput,
  ProcessPaymentResult,
} from './payment-provider.interface';

/**
 * Simulated payment provider (stands in for Mercado Pago).
 *
 * Demo rules:
 *  - Bank transfers are always PENDING (require admin confirmation).
 *  - Card numbers containing "9999" are REJECTED (insufficient funds).
 *  - Card numbers ending in an even digit are APPROVED.
 *  - Anything else stays PENDING.
 *
 * Replace this provider by a MercadoPagoProvider implementing the same
 * PaymentProvider interface when real integrations are added.
 */
@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  async processPayment(
    input: ProcessPaymentInput,
  ): Promise<ProcessPaymentResult> {
    // Simulate network latency so the UI can show a realistic loading state.
    await new Promise((resolve) => setTimeout(resolve, 1200));

    if (input.method === 'BANK_TRANSFER') {
      return {
        status: 'PENDING',
        reference: this.generateReference('TRF'),
        message:
          'Transferencia recibida. El pago quedó pendiente de confirmación.',
      };
    }

    const digits = (input.cardNumber || '').replace(/\D/g, '');
    const brand = this.detectBrand(digits);
    const lastFour = digits.slice(-4);

    if (digits.length < 12) {
      return {
        status: 'REJECTED',
        reference: this.generateReference('MP'),
        message: 'El número de tarjeta ingresado no es válido.',
        cardBrand: brand,
        lastFour,
      };
    }

    if (digits.includes('9999')) {
      return {
        status: 'REJECTED',
        reference: this.generateReference('MP'),
        message: 'La operación fue rechazada por el emisor de la tarjeta.',
        cardBrand: brand,
        lastFour,
      };
    }

    if (parseInt(digits.slice(-1), 10) % 2 === 0) {
      return {
        status: 'APPROVED',
        reference: this.generateReference('MP'),
        message: 'Pago aprobado correctamente.',
        cardBrand: brand,
        lastFour,
      };
    }

    return {
      status: 'PENDING',
      reference: this.generateReference('MP'),
      message: 'Pago en revisión. Se confirmará en las próximas horas.',
      cardBrand: brand,
      lastFour,
    };
  }

  detectBrand(cardNumber: string): string | undefined {
    if (/^(34|37)/.test(cardNumber)) return 'AMEX';
    if (/^5[1-5]/.test(cardNumber)) return 'MASTERCARD';
    if (/^4/.test(cardNumber)) return 'VISA';
    if (/^(60|62)/.test(cardNumber)) return 'CABAL';
    if (/^6/.test(cardNumber)) return 'MAESTRO';
    return undefined;
  }

  private generateReference(prefix: string): string {
    const random = Math.random().toString(36).slice(2, 10).toUpperCase();
    const date = new Date();
    const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    return `${prefix}-${datePart}-${random}`;
  }
}