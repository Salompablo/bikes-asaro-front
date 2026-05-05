import { Component, inject, signal, computed } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CartItem, CartStateService } from '../../core/services/cart-state.service';
import { CheckoutService, DeliveryMethod } from './services/checkout.service';
import { ToastService } from '../../shared/services/toast.service';
import { ProductService } from '../admin/services/product.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

const SHIPPING_COST = 15000;

interface CheckoutConflictErrorBody {
  message?: string;
  errorCode?: string;
  retryAfterSeconds?: number;
}

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
  private readonly productService = inject(ProductService);

  readonly loading = signal(false);
  readonly stockError = signal<string | null>(null);
  readonly suggestedProductId = signal<number | null>(null);
  readonly stockErrorActionLabel = signal('Ajustar cantidad en el producto');

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
    this.stockErrorActionLabel.set('Ajustar cantidad en el producto');

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
          this.checkoutService.storePendingOrderId(res.orderId);
          window.location.href = res.initPoint;
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          if (err.status === 409) {
            const conflict = (err.error ?? {}) as CheckoutConflictErrorBody;
            if (conflict.errorCode === 'RESERVED_TEMPORARILY') {
              this.stockError.set(this.buildTemporarilyReservedMessage(conflict));
              this.stockErrorActionLabel.set('Ver disponibilidad del producto');
              this.resolveSuggestedProduct();
            } else {
              const message = conflict.message ?? 'Algunos productos no tienen stock suficiente.';
              this.stockError.set(this.localizeStockMessage(message));
              this.stockErrorActionLabel.set('Ajustar cantidad en el producto');
              this.resolveSuggestedProduct();
            }
          } else {
            this.toast.error('Ocurrió un error al procesar el pago. Intentá de nuevo.');
          }
        },
      });
  }

  goToAdjustProduct(): void {
    this.stockError.set(null);
    const productId = this.suggestedProductId();
    if (productId) {
      this.router.navigate(['/products', productId]);
      return;
    }

    const fallbackProductId = this.cartService.items()[0]?.productId;
    if (fallbackProductId) {
      this.router.navigate(['/products', fallbackProductId]);
      return;
    }

    this.router.navigate(['/catalog']);
  }

  removeItem(productId: number): void {
    this.cartService.removeItem(productId);
    this.toast.info('Producto quitado del carrito');
  }

  normalizeImageUrl(url: string): string {
    if (!url) return this.placeholderImage();

    const trimmed = url.trim();
    if (!trimmed) return this.placeholderImage();

    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('/')
    ) {
      return trimmed;
    }

    if (trimmed.startsWith('public/')) {
      return `/${trimmed.replace(/^public\//, '')}`;
    }

    if (trimmed.startsWith('assets/')) {
      return `/${trimmed}`;
    }

    return trimmed;
  }

  onItemImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    const currentSrc = img.getAttribute('src') ?? '';

    if (currentSrc.startsWith('public/')) {
      img.src = this.normalizeImageUrl(currentSrc);
      return;
    }

    if (currentSrc.startsWith('assets/')) {
      img.src = this.normalizeImageUrl(currentSrc);
      return;
    }

    img.src = this.placeholderImage();
  }

  isGenericCheckoutImage(item: CartItem): boolean {
    if (item.isGenericImage) return true;

    const src = this.normalizeImageUrl(item.image).toLowerCase();
    return (
      src.includes('/assets/') ||
      src.includes('default') ||
      src.includes('categoria') ||
      src.includes('category') ||
      src.includes('placeholder')
    );
  }

  private localizeStockMessage(message: string): string {
    const translated = message.replace(/not enough stock for/gi, 'Stock insuficiente para');
    return translated.trim() || 'Algunos productos no tienen stock suficiente.';
  }

  private buildTemporarilyReservedMessage(conflict: CheckoutConflictErrorBody): string {
    const base =
      'No hay unidades disponibles para compra inmediata. Las ultimas unidades estan temporalmente reservadas.';
    const retryAfterSeconds = conflict.retryAfterSeconds;

    if (!Number.isFinite(retryAfterSeconds) || !retryAfterSeconds || retryAfterSeconds <= 0) {
      return `${base} Intenta nuevamente en unos minutos.`;
    }

    const minutes = Math.ceil(retryAfterSeconds / 60);
    return `${base} Intenta nuevamente en aproximadamente ${minutes} minuto${minutes === 1 ? '' : 's'}.`;
  }

  private resolveSuggestedProduct(): void {
    const items = this.cartService.items();
    if (items.length === 0) {
      this.suggestedProductId.set(null);
      return;
    }

    forkJoin(
      items.map((item) =>
        this.productService.getById(item.productId).pipe(
          catchError(() =>
            of({
              id: item.productId,
              stock: 0,
              availableToReserveNow: 0,
            } as { id: number; stock: number; availableToReserveNow?: number }),
          ),
        ),
      ),
    ).subscribe((products) => {
      const insufficient = products.find((product, index) => {
        const available = product.availableToReserveNow ?? product.stock;
        return available < items[index].quantity;
      });
      this.suggestedProductId.set(insufficient?.id ?? items[0].productId ?? null);
    });
  }

  private placeholderImage(): string {
    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-family="Arial" font-size="11">Sin imagen</text></svg>';
  }
}
