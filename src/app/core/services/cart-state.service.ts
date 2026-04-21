import { Injectable, signal, computed } from '@angular/core';

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
  isGenericImage?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CartStateService {
  private readonly cartItems = signal<CartItem[]>([]);

  readonly items = this.cartItems.asReadonly();

  readonly totalItems = computed(() => {
    return this.cartItems().reduce((total, item) => total + item.quantity, 0);
  });

  readonly totalPrice = computed(() => {
    return this.cartItems().reduce((total, item) => total + item.price * item.quantity, 0);
  });

  addItem(item: CartItem): void {
    this.cartItems.update((items) => {
      const existing = items.find((i) => i.productId === item.productId);
      if (existing) {
        return items.map((i) =>
          i.productId === item.productId
            ? {
                ...i,
                quantity: i.quantity + item.quantity,
                isGenericImage: i.isGenericImage || item.isGenericImage,
              }
            : i,
        );
      }
      return [...items, item];
    });
  }

  removeItem(productId: number): void {
    this.cartItems.update((items) => items.filter((i) => i.productId !== productId));
  }

  clearCart(): void {
    this.cartItems.set([]);
  }
}
