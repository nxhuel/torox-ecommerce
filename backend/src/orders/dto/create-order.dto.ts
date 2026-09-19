import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ShippingMethod } from '../entities/order.entity';

export class ShippingAddressDto {
  @IsString() @IsNotEmpty() province: string;
  @IsString() @IsNotEmpty() city: string;
  @IsString() @IsNotEmpty() postalCode: string;
  @IsString() @IsNotEmpty() address: string;
  @IsString() @IsNotEmpty() number: string;
  @IsOptional() @IsString() apartment?: string;
  @IsOptional() @IsString() references?: string;
}

export class PaymentDataDto {
  @IsEnum(['CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER'])
  method: 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER';

  @IsOptional() @IsString() cardNumber?: string;
  @IsOptional() @IsString() cardHolder?: string;
  @IsOptional() @IsString() cardExpiry?: string;
  @IsOptional() @IsString() cardCvc?: string;
}

export class CreateOrderDto {
  @IsString() @IsNotEmpty() customerName: string;
  @IsEmail({}, { message: 'Email inválido' }) customerEmail: string;
  @IsOptional() @IsString() customerPhone?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @IsEnum(ShippingMethod)
  shippingMethod: ShippingMethod;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PaymentDataDto)
  payment?: PaymentDataDto;

  @IsOptional() @IsString() notes?: string;

  @IsOptional() @IsString() cartSessionId?: string;
}