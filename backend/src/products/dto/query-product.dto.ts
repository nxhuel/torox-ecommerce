import { IsOptional, IsString, IsNumber, IsBoolean, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum SortBy {
  RELEVANCE = 'relevance',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  BEST_SELLERS = 'best_sellers',
}

export class QueryProductDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @Type(() => Number) @IsNumber() minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxPrice?: number;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isOnSale?: boolean;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isFeatured?: boolean;
  @IsOptional() @Type(() => Boolean) @IsBoolean() inStock?: boolean;
  @IsOptional() @IsEnum(SortBy) sortBy?: SortBy;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) limit?: number;
}
