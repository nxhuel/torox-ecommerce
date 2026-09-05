import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
} from 'class-validator';
import { PromotionType } from '../entities/promotion.entity';

export class CreatePromotionDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(PromotionType) type: PromotionType;
  @IsNumber() @Min(0) value: number;
  @IsString() @IsNotEmpty() startDate: string;
  @IsString() @IsNotEmpty() endDate: string;
  @IsOptional() @IsArray() productIds?: string[];
  @IsOptional() @IsArray() categoryIds?: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
}