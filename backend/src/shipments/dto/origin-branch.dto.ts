import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BranchAddressDto {
  @IsOptional() @IsString() street?: string;
  @IsOptional() @IsString() number?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
}

export class OriginBranchDto {
  @IsString()
  @IsNotEmpty({ message: 'branchCode es requerido' })
  branchCode: string;

  @IsString()
  @IsNotEmpty({ message: 'carrier es requerido' })
  carrier: string;

  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() carrierName?: string;
  @IsOptional() @IsString() reference?: string;

  @IsOptional()
  @IsIn(['ORIGIN', 'DESTINATION', 'BOTH'])
  type?: 'ORIGIN' | 'DESTINATION' | 'BOTH';

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BranchAddressDto)
  address?: BranchAddressDto;

  @IsOptional() @IsNumber() distanceKm?: number;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() hours?: unknown;
}
