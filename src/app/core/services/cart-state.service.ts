import { Injectable, PLATFORM_ID, inject, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const CART_STORAGE_KEY = 'cart_items';
const TOKEN_KEY = 'auth_token';

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
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cartItems = signal<CartItem[]>(this.loadCartItems());

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
        const updated = items.map((i) =>
          i.productId === item.productId
            ? {
                ...i,
                quantity: i.quantity + item.quantity,
                isGenericImage: i.isGenericImage || item.isGenericImage,
              }
            : i,
        );
        this.persistCartItems(updated);
        return updated;
      }
      const updated = [...items, item];
      this.persistCartItems(updated);
      return updated;
    });
  }

  removeItem(productId: number): void {
    this.cartItems.update((items) => {
      const updated = items.filter((i) => i.productId !== productId);
      this.persistCartItems(updated);
      return updated;
    });
  }

  clearCart(): void {
    this.cartItems.set([]);
    this.persistCartItems([]);
  }

  private loadCartItems(): CartItem[] {
    if (!isPlatformBrowser(this.platformId)) return [];

    const raw = localStorage.getItem(this.cartStorageKey());
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((item): item is CartItem => {
          return (
            Number.isFinite(Number(item?.productId)) &&
            typeof item?.name === 'string' &&
            Number.isFinite(Number(item?.price)) &&
            typeof item?.image === 'string' &&
            Number.isFinite(Number(item?.quantity)) &&
            Number(item.quantity) > 0
          );
        })
        .map((item) => ({
          productId: Number(item.productId),
          name: item.name,
          price: Number(item.price),
          image: item.image,
          quantity: Number(item.quantity),
          isGenericImage: Boolean(item.isGenericImage),
        }));
    } catch {
      return [];
    }
  }

  private persistCartItems(items: CartItem[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(this.cartStorageKey(), JSON.stringify(items));
  }

  private cartStorageKey(): string {
    const userId = this.currentUserId();
    return userId ? `${CART_STORAGE_KEY}_${userId}` : CART_STORAGE_KEY;
  }

  private currentUserId(): number | null {
    if (!isPlatformBrowser(this.platformId)) return null;

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload)) as { userId?: number };
      const parsed = Number(decoded.userId);
      return Number.isFinite(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}
