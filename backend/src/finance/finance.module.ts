import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { FinanceMovement } from './entities/finance-movement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FinanceMovement]), PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}