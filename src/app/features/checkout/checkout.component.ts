import { Component, inject, signal, computed } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CartStateService } from '../../core/services/cart-state.service';
import { CheckoutService, DeliveryMethod } from './services/checkout.service';
import { ToastService } from '../../shared/services/toast.service';

const SHIPPING_COST = 15000;

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, FormsModule],
  templateUrl: './checkout.component.html',
})
export class CheckoutComponent {
  readonly cartService = inject(CartStateService);
  private readonly checkoutService = inject(CheckoutService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly stockError = signal<string | null>(null);

  readonly deliveryMethod = signal<DeliveryMethod>('STORE_PICKUP');
  readonly shippingAddress = signal('');
  readonly zipCode = signal('');

  readonly isShipping = computed(() => this.deliveryMethod() === 'SHIPPING');
  readonly shippingCost = computed(() => (this.isShipping() ? SHIPPING_COST : 0));
  readonly orderTotal = computed(() => this.cartService.totalPrice() + this.shippingCost());

  readonly canPay = computed(() => {
    if (this.isShipping()) {
      return this.shippingAddress().trim().length > 0 && this.zipCode().trim().length > 0;
    }
    return true;
  });

  pay(): void {
    const items = this.cartService.items();
    if (items.length === 0 || !this.canPay()) return;

    this.loading.set(true);
    this.stockError.set(null);

    this.checkoutService
      .createPreference(
        items,
        this.deliveryMethod(),
        this.isShipping() ? this.shippingAddress() : undefined,
        this.isShipping() ? this.zipCode() : undefined,
        this.isShipping() ? this.shippingCost() : undefined,
      )
      .subscribe({
        next: (res) => {
          window.location.href = res.initPoint;
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          if (err.status === 409) {
            const message = err.error?.message ?? 'Algunos productos no tienen stock suficiente.';
            this.stockError.set(message);
          } else {
            this.toast.error('Ocurrió un error al procesar el pago. Intentá de nuevo.');
          }
        },
      });
  }

  goToCart(): void {
    this.stockError.set(null);
    this.router.navigate(['/catalog']);
  }
}
