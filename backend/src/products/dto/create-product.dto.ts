import { IsNotEmpty, IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsObject, Min } from 'class-validator';

export class CreateProductDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() shortDescription?: string;
  @IsString() @IsNotEmpty() categoryId: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() sku?: string;
  @IsNumber() @Min(0) price: number;
  @IsOptional() @IsNumber() @Min(0) originalPrice?: number;
  @IsOptional() @IsNumber() @Min(0) cost?: number;
  @IsOptional() @IsNumber() @Min(0) stock?: number;
  @IsOptional() @IsArray() images?: string[];
  @IsOptional() @IsObject() specifications?: Record<string, string>;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsBoolean() isOnSale?: boolean;
  @IsOptional() @IsNumber() @Min(0) discountPercentage?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
