import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('cart')
export class CartController {
  constructor(private readonly service: CartService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  getCart(@CurrentUser() user: User, @Query('sessionId') sessionId?: string) {
    return this.service.getCartWithTotals(user?.id, sessionId);
  }

  @Post('items')
  addItem(
    @Body() body: { cartId: string; productId: string; quantity: number; variantId?: string | null },
  ) {
    return this.service.addItem(body.cartId, body.productId, body.quantity, body.variantId);
  }

  @Patch('items/:itemId')
  updateItem(
    @Param('itemId') itemId: string,
    @Body() body: { cartId: string; quantity: number },
  ) {
    return this.service.updateItem(body.cartId, itemId, body.quantity);
  }

  @Delete('items/:itemId')
  removeItem(@Param('itemId') itemId: string, @Query('cartId') cartId: string) {
    return this.service.removeItem(cartId, itemId);
  }

  @Delete(':cartId/clear')
  clearCart(@Param('cartId') cartId: string) {
    return this.service.clearCart(cartId);
  }

  @Post('init')
  @UseGuards(OptionalJwtAuthGuard)
  initCart(@CurrentUser() user: User, @Body() body: { sessionId?: string }) {
    return this.service.getOrCreate(user?.id, body.sessionId);
  }
}
