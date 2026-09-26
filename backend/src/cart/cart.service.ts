import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart, CartItem } from './entities/cart.entity';
import { ProductsService } from '../products/products.service';


@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private cartRepo: Repository<Cart>,
    @InjectRepository(CartItem) private itemRepo: Repository<CartItem>,
    private readonly productsService: ProductsService,
  ) {}

  async getOrCreate(userId?: string, sessionId?: string): Promise<Cart> {
    let cart: Cart | null = null;

    if (userId) {
      cart = await this.cartRepo.findOne({ where: { userId }, relations: { items: true } });
    } else if (sessionId) {
      cart = await this.cartRepo.findOne({ where: { sessionId }, relations: { items: true } });
    }

    if (!cart) {
      cart = this.cartRepo.create({ userId, sessionId, items: [] });
      cart = await this.cartRepo.save(cart);
    }

    return cart;
  }

  async addItem(cartId: string, productId: string, quantity: number): Promise<Cart> {
    const cart = await this.cartRepo.findOne({ where: { id: cartId }, relations: { items: true } });
    if (!cart) throw new NotFoundException('Carrito no encontrado');

    const product = await this.productsService.findOne(productId);
    if (!product.isActive) throw new BadRequestException('Producto no disponible');
    if (product.stock < quantity) throw new BadRequestException(`Stock insuficiente. Disponible: ${product.stock}`);

    const existingItem = cart.items?.find(i => i.productId === productId);
    // `finalPrice` is derived from the list price + discount on the entity.
    const finalPrice = Number(product.finalPrice);

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (product.stock < newQty) throw new BadRequestException(`Stock insuficiente. Disponible: ${product.stock}`);
      existingItem.quantity = newQty;
      await this.itemRepo.save(existingItem);
    } else {
      const item = this.itemRepo.create({
        cartId,
        productId,
        quantity,
        unitPrice: finalPrice,
        productSnapshot: {
          name: product.name,
          image: product.images?.[0],
          brand: product.brand,
          slug: product.slug,
          stock: product.stock,
        },
      });
      await this.itemRepo.save(item);
    }

    const updated = await this.cartRepo.findOne({ where: { id: cartId }, relations: { items: true } });
    return updated!;
  }

  async updateItem(cartId: string, itemId: string, quantity: number): Promise<Cart> {
    const item = await this.itemRepo.findOne({ where: { id: itemId, cartId } });
    if (!item) throw new NotFoundException('Item no encontrado');

    if (quantity <= 0) {
      await this.itemRepo.remove(item);
    } else {
      const product = await this.productsService.findOne(item.productId);
      if (product.stock < quantity) throw new BadRequestException(`Stock insuficiente`);
      item.quantity = quantity;
      await this.itemRepo.save(item);
    }

    const updated = await this.cartRepo.findOne({ where: { id: cartId }, relations: { items: true } });
    return updated!;
  }

  async removeItem(cartId: string, itemId: string): Promise<Cart> {
    const item = await this.itemRepo.findOne({ where: { id: itemId, cartId } });
    if (item) await this.itemRepo.remove(item);
    const updated = await this.cartRepo.findOne({ where: { id: cartId }, relations: { items: true } });
    return updated!;
  }

  async clearCart(cartId: string): Promise<void> {
    await this.itemRepo.delete({ cartId });
  }

  calculateTotals(cart: Cart) {
    const subtotal = (cart.items || []).reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity, 0,
    );
    // El costo de envío no se conoce hasta el checkout: se cotiza con Envia.com
    // según la dirección del cliente. Acá queda en 0 y la UI lo muestra como "A cotizar".
    const shippingCost = 0;
    const total = subtotal + shippingCost;
    return { subtotal, shippingCost, discount: 0, total };
  }

  async getCartWithTotals(userId?: string, sessionId?: string) {
    const cart = await this.getOrCreate(userId, sessionId);
    const totals = this.calculateTotals(cart);
    return { ...cart, ...totals };
  }
}
