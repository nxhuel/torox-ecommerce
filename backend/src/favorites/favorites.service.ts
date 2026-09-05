import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { ProductsService } from '../products/products.service';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite) private repo: Repository<Favorite>,
    private productsService: ProductsService,
  ) {}

  async findAllByUser(userId: string) {
    const favs = await this.repo.find({ where: { userId } });
    const productIds = favs.map(f => f.productId);
    if (!productIds.length) return [];
    const products = await Promise.all(productIds.map(id => this.productsService.findOne(id).catch(() => null)));
    return products.filter((product): product is NonNullable<typeof product> => product !== null).map(product => ({
      ...product,
      favoriteId: favs.find(f => f.productId === product.id)?.id,
    }));
  }

  async toggle(userId: string, productId: string) {
    const existing = await this.repo.findOne({ where: { userId, productId } });
    if (existing) {
      await this.repo.remove(existing);
      return { added: false, message: 'Eliminado de favoritos' };
    }
    const fav = this.repo.create({ userId, productId });
    await this.repo.save(fav);
    return { added: true, message: 'Agregado a favoritos' };
  }

  async isFavorite(userId: string, productId: string): Promise<boolean> {
    const fav = await this.repo.findOne({ where: { userId, productId } });
    return !!fav;
  }

  async getUserFavoriteIds(userId: string): Promise<string[]> {
    const favs = await this.repo.find({ where: { userId } });
    return favs.map(f => f.productId);
  }
}
