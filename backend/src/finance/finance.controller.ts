import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: any,
  ) {
    return this.service.findAll(page ? +page : 1, limit ? +limit : 20, type);
  }

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }

  @Get('monthly')
  getMonthly(@Query('months') months?: string) {
    return this.service.getMonthlySeries(months ? +months : 12);
  }

  @Get('by-category')
  getByCategory() {
    return this.service.getByCategory();
  }

  @Post('expenses')
  recordExpense(@Body() dto: CreateExpenseDto) {
    return this.service.recordExpense(dto);
  }
}