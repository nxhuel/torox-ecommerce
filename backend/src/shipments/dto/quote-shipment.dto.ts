import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QuoteItemDto {
  @IsUUID('4', { message: 'productId inválido' })
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class QuoteShipmentDto {
  @IsString()
  @IsNotEmpty({ message: 'province es requerido' })
  province: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsString()
  @IsNotEmpty({ message: 'postalCode es requerido' })
  postalCode: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  number?: string;

  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  @ArrayNotEmpty({ message: 'items es requerido para cotizar' })
  items: QuoteItemDto[];
}
