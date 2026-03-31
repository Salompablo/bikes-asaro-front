import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CartStateService {
  private readonly cartItems = signal<any[]>([]);

  readonly totalItems = computed(() => {
    return this.cartItems().reduce((total, item) => total + (item.quantity || 1), 0);
  });

  addItem(item: any): void {
    this.cartItems.update((items) => [...items, item]);
  }
}
