import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsObject,
  Min,
  Max,
  ArrayMaxSize,
  ValidateNested,
  IsDefined,
} from 'class-validator';
import { Type } from 'class-transformer';

class SpecRowDto {
  @IsString() @IsNotEmpty() label: string;
  @IsString() @IsNotEmpty() value: string;
}

export class SpecGroupDto {
  @IsString() @IsNotEmpty() title: string;
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => SpecRowDto)
  rows: SpecRowDto[];
}

export class CreateProductDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() shortDescription?: string;
  @IsString() @IsNotEmpty() categoryId: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() sku?: string;
  /** List price; a discount is applied on top when `discountPercentage` is set. */
  @IsNumber() @Min(0) price: number;
  @IsOptional() @IsNumber() @Min(0) cost?: number;
  @IsOptional() @IsNumber() @Min(0) stock?: number;
  @IsOptional() @IsArray() images?: string[];
  @IsOptional() @IsObject() specifications?: Record<string, string>;

  @IsOptional() @IsArray() @ArrayMaxSize(2) @IsString({ each: true })
  highlights?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsDefined()
  @ValidateNested({ each: true }) @Type(() => SpecGroupDto)
  specGroups?: SpecGroupDto[];

  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsBoolean() isOnSale?: boolean;
  @IsOptional() @IsNumber() @Min(0) @Max(100) discountPercentage?: number | null;
  @IsOptional() @IsBoolean() isActive?: boolean;

  // ─── Logística (Envia.com) ──────────────────────────────────────────────
  /** Peso real en kg (usado para cotizar con Envia.com). */
  @IsOptional() @IsNumber() @Min(0.001) weightKg?: number;
  /** Ancho del embalaje en cm. */
  @IsOptional() @IsNumber() @Min(1) widthCm?: number;
  /** Alto del embalaje en cm. */
  @IsOptional() @IsNumber() @Min(1) heightCm?: number;
  /** Largo del embalaje en cm. */
  @IsOptional() @IsNumber() @Min(1) lengthCm?: number;
}
