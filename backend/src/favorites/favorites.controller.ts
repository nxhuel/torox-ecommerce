import { Controller, Get, Post, Param, Body, UseGuards, Query } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly service: FavoritesService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.service.findAllByUser(user.id);
  }

  @Get('ids')
  getFavoriteIds(@CurrentUser() user: User) {
    return this.service.getUserFavoriteIds(user.id);
  }

  @Post('toggle')
  toggle(@CurrentUser() user: User, @Body() body: { productId: string }) {
    return this.service.toggle(user.id, body.productId);
  }

  @Get(':productId/check')
  check(@CurrentUser() user: User, @Param('productId') productId: string) {
    return this.service.isFavorite(user.id, productId);
  }
}
