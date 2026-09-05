export type PaymentStatus = 'APPROVED' | 'PENDING' | 'REJECTED';

export type PaymentMethod = 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER';

export interface ProcessPaymentInput {
  amount: number;
  method: PaymentMethod;
  cardNumber?: string;
  cardHolder?: string;
  cardExpiry?: string;
  cardCvc?: string;
}

export interface ProcessPaymentResult {
  status: PaymentStatus;
  reference: string;
  message: string;
  cardBrand?: string;
  lastFour?: string;
}

export interface PaymentProvider {
  processPayment(input: ProcessPaymentInput): Promise<ProcessPaymentResult>;
}

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';