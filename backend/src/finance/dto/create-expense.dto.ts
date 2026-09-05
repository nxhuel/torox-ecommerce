import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MovementCategory } from '../entities/finance-movement.entity';

export class CreateExpenseDto {
  @IsEnum(MovementCategory)
  category: MovementCategory;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  date?: string;
}