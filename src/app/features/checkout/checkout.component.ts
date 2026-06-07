import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CartItem, CartStateService } from '../../core/services/cart-state.service';
import {
  CheckoutPreferenceResponse,
  CheckoutService,
  DeliveryMethod,
  ShippingQuoteResponse,
} from './services/checkout.service';
import { ToastService } from '../../shared/services/toast.service';
import { ProductService } from '../admin/services/product.service';
import { OrderResponse } from '../admin/models/admin.models';
import { OrdersService } from '../orders/services/orders.service';
import { Subscription, forkJoin, interval, of } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { AuthService } from '../auth/services/auth.service';

const DEFAULT_POLLING_INTERVAL_MS = 12000;

type CheckoutUiState =
  | 'CHECKOUT_READY'
  | 'SHIPPING_QUOTE_REQUESTED'
  | 'QUOTE_READY_PAYMENT_PENDING'
  | 'PAID'
  | 'CANCELLED'
  | 'ERROR';

interface CheckoutConflictErrorBody {
  message?: string;
  errorCode?: string;
  retryAfterSeconds?: number;
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink, FormsModule],
  templateUrl: './checkout.component.html',
})
export class CheckoutComponent implements OnInit, OnDestroy {
  readonly cartService = inject(CartStateService);
  private readonly checkoutService = inject(CheckoutService);
  private readonly ordersService = inject(OrdersService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);
  private readonly authService = inject(AuthService);
  private readonly pollingIntervalMs = DEFAULT_POLLING_INTERVAL_MS;

  private orderPollingSubscription: Subscription | null = null;
  private retryCountdownSubscription: Subscription | null = null;
  private quoteDeadlineSubscription: Subscription | null = null;

  readonly loading = signal(false);
  readonly stockError = signal<string | null>(null);
  readonly suggestedProductId = signal<number | null>(null);
  readonly stockErrorActionLabel = signal('Ajustar cantidad en el producto');

  readonly deliveryMethod = signal<DeliveryMethod>('STORE_PICKUP');
  readonly shippingAddress = signal('');
  readonly zipCode = signal('');
  readonly contactPhone = signal('');
  readonly savePhoneToProfile = signal(false);
  readonly phoneError = signal<string | null>(null);
  readonly shippingAddressError = signal<string | null>(null);
  readonly zipCodeError = signal<string | null>(null);
  readonly checkoutState = signal<CheckoutUiState>('CHECKOUT_READY');
  readonly currentOrderId = signal<number | null>(null);
  readonly resumedOrderNotice = signal<string | null>(null);
  readonly payableNow = signal(false);
  readonly checkoutUrl = signal<string | null>(null);
  readonly quoteExpiresAt = signal<string | null>(null);
  readonly quoteTimeLeftLabel = signal<string>('');
  readonly preferenceId = signal<string | null>(null);
  readonly initPoint = signal<string | null>(null);
  readonly orderStatusLabel = signal<string>('');
  readonly retryAfterSeconds = signal(0);

  readonly shippingQuoteLoading = signal(false);
  readonly shippingQuote = signal<ShippingQuoteResponse | null>(null);
  readonly shippingQuoteError = signal<string | null>(null);

  constructor() {
    this.authService.loadCurrentUserProfile().subscribe({
      next: (profile) => {
        if (profile?.defaultPhone) {
          this.contactPhone.set(profile.defaultPhone);
        }
      },
      error: () => {
        // Prefill is optional. Checkout must still be usable without this call.
      },
    });
  }

  readonly isShipping = computed(() => this.deliveryMethod() === 'SHIPPING');
  readonly shippingCost = computed(() => this.shippingQuote()?.cost ?? 0);
  readonly orderTotal = computed(() => this.cartService.totalPrice() + this.shippingCost());
  readonly paymentButtonLabel = computed(() => {
    if (this.loading()) return 'Procesando...';

    if (this.isShipping()) {
      if (this.checkoutState() === 'SHIPPING_QUOTE_REQUESTED') {
        return 'Cotización solicitada';
      }

      if (this.checkoutState() === 'QUOTE_READY_PAYMENT_PENDING') {
        return 'Pagar ahora';
      }

      return 'Solicitar cotización';
    }

    return 'Pagar con Mercado Pago';
  });

  readonly canTriggerPayment = computed(() => {
    const hasContactPhone = this.contactPhone().trim().length > 0;
    if (!hasContactPhone || this.loading()) return false;

    if (!this.isShipping()) {
      return true;
    }

    const hasAddress = this.shippingAddress().trim().length > 0;
    const hasZipCode = this.zipCode().trim().length > 0;

    if (!hasAddress || !hasZipCode) return false;
    if (
      !this.isValidShippingAddress(this.shippingAddress()) ||
      !this.isValidZipCode(this.zipCode())
    ) {
      return false;
    }

    if (this.checkoutState() === 'SHIPPING_QUOTE_REQUESTED') {
      return false;
    }

    if (this.checkoutState() === 'QUOTE_READY_PAYMENT_PENDING') {
      return this.payableNow() && this.hasMercadoPagoTarget();
    }

    return this.checkoutState() === 'CHECKOUT_READY' || this.checkoutState() === 'ERROR';
  });

  readonly showCheckoutState = computed(() => {
    if (!this.isShipping()) return false;
    return this.checkoutState() !== 'CHECKOUT_READY';
  });

  ngOnInit(): void {
    this.resumePendingOrderFlow();
  }

  ngOnDestroy(): void {
    this.stopOrderPolling();
    this.stopRetryCountdown();
    this.stopQuoteDeadlineCountdown();
  }

  pay(): void {
    const items = this.cartService.items();
    if (items.length === 0 || !this.canTriggerPayment()) return;

    if (!this.contactPhone().trim()) {
      this.phoneError.set('El telefono de contacto es obligatorio.');
      return;
    }

    if (this.isShipping() && this.checkoutState() === 'QUOTE_READY_PAYMENT_PENDING') {
      this.redirectToMercadoPago();
      return;
    }

    this.loading.set(true);
    this.resumedOrderNotice.set(null);
    this.stockError.set(null);
    this.stockErrorActionLabel.set('Ajustar cantidad en el producto');
    this.phoneError.set(null);
    this.stopRetryCountdown();

    this.checkoutService
      .createPreference(
        items,
        this.deliveryMethod(),
        this.contactPhone().trim(),
        this.savePhoneToProfile(),
        this.isShipping() ? this.shippingAddress().trim() : undefined,
        this.isShipping() ? this.zipCode().trim() : undefined,
      )
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.currentOrderId.set(res.orderId);
          this.checkoutService.storePendingOrderId(res.orderId);
          this.applyCreatePreferenceResponse(res);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          if (err.status === 409) {
            const conflict = (err.error ?? {}) as CheckoutConflictErrorBody;
            if (conflict.errorCode === 'RESERVED_TEMPORARILY') {
              this.stockError.set(this.buildTemporarilyReservedMessage(conflict));
              this.checkoutState.set('ERROR');
              this.stockErrorActionLabel.set('Ver disponibilidad del producto');
              if (
                Number.isFinite(conflict.retryAfterSeconds) &&
                (conflict.retryAfterSeconds ?? 0) > 0
              ) {
                this.startRetryCountdown(conflict.retryAfterSeconds ?? 0);
              }
              this.resolveSuggestedProduct();
            } else {
              const message = conflict.message ?? 'Algunos productos no tienen stock suficiente.';
              this.stockError.set(this.localizeStockMessage(message));
              this.checkoutState.set('ERROR');
              this.stockErrorActionLabel.set('Ajustar cantidad en el producto');
              this.resolveSuggestedProduct();
            }
          } else {
            if (err.status === 400) {
              this.phoneError.set('Revisa el telefono de contacto e intenta nuevamente.');
            }
            this.toast.error('Ocurrió un error al procesar el pago. Intentá de nuevo.');
          }
        },
      });
  }

  selectDeliveryMethod(method: DeliveryMethod): void {
    this.deliveryMethod.set(method);
    this.stockError.set(null);
    this.resumedOrderNotice.set(null);
    this.stopOrderPolling();

    if (method === 'STORE_PICKUP') {
      this.checkoutState.set('CHECKOUT_READY');
      this.payableNow.set(false);
      this.checkoutUrl.set(null);
      this.quoteExpiresAt.set(null);
      this.quoteTimeLeftLabel.set('');
      this.preferenceId.set(null);
      this.initPoint.set(null);
      this.stopQuoteDeadlineCountdown();
      return;
    }

    this.shippingAddress.set('');
    this.zipCode.set('');
    this.shippingQuote.set(null);
    this.shippingQuoteError.set(null);
    this.shippingAddressError.set(null);
    this.zipCodeError.set(null);
    this.orderStatusLabel.set('');
    this.checkoutState.set('CHECKOUT_READY');
    this.payableNow.set(false);
    this.checkoutUrl.set(null);
    this.quoteExpiresAt.set(null);
    this.quoteTimeLeftLabel.set('');
    this.preferenceId.set(null);
    this.initPoint.set(null);
    this.stopQuoteDeadlineCountdown();

    if (this.checkoutState() !== 'QUOTE_READY_PAYMENT_PENDING') {
      this.checkoutState.set('CHECKOUT_READY');
    }
  }

  onContactPhoneChange(value: string): void {
    this.contactPhone.set(value);
    if (value.trim()) {
      this.phoneError.set(null);
    }
  }

  onShippingAddressChange(value: string): void {
    this.shippingAddress.set(value);
    this.shippingAddressError.set(this.validateShippingAddress(value));
    if (this.checkoutState() === 'QUOTE_READY_PAYMENT_PENDING') {
      this.checkoutState.set('CHECKOUT_READY');
      this.payableNow.set(false);
      this.preferenceId.set(null);
      this.initPoint.set(null);
    }
  }

  onZipCodeChange(value: string): void {
    this.zipCode.set(value);
    this.shippingQuote.set(null);
    this.shippingQuoteError.set(null);
    this.zipCodeError.set(this.validateZipCode(value));

    if (this.checkoutState() === 'QUOTE_READY_PAYMENT_PENDING') {
      this.checkoutState.set('CHECKOUT_READY');
      this.payableNow.set(false);
      this.preferenceId.set(null);
      this.initPoint.set(null);
    }
  }

  loadShippingQuoteEstimate(): void {
    if (!this.isShipping()) return;

    const zipCode = this.zipCode().trim();
    if (!zipCode) {
      this.shippingQuoteError.set('Ingresá un código postal para estimar el envío.');
      return;
    }

    this.shippingQuoteLoading.set(true);
    this.shippingQuoteError.set(null);

    this.computeCartWeight().subscribe({
      next: (totalWeight) => {
        this.checkoutService.getShippingQuote(zipCode, totalWeight).subscribe({
          next: (quote) => {
            this.shippingQuote.set(quote);
            this.shippingQuoteLoading.set(false);
          },
          error: () => {
            this.shippingQuoteLoading.set(false);
            this.shippingQuoteError.set('No pudimos calcular la estimación de envío ahora.');
          },
        });
      },
      error: () => {
        this.shippingQuoteLoading.set(false);
        this.shippingQuoteError.set('No pudimos calcular el peso del carrito para cotizar envío.');
      },
    });
  }

  getCheckoutStateLabel(): string {
    if (this.checkoutState() === 'CHECKOUT_READY') return 'Listo para checkout';
    if (this.checkoutState() === 'SHIPPING_QUOTE_REQUESTED') return 'Cotización solicitada';
    if (this.checkoutState() === 'QUOTE_READY_PAYMENT_PENDING') {
      return 'Cotización aprobada';
    }
    if (this.checkoutState() === 'PAID') return 'Pago confirmado';
    if (this.checkoutState() === 'CANCELLED') return 'Cancelado';
    return 'Error';
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

  private applyCreatePreferenceResponse(response: CheckoutPreferenceResponse): void {
    this.payableNow.set(Boolean(response.payableNow));
    this.checkoutUrl.set(response.checkoutUrl ?? null);
    this.quoteExpiresAt.set(response.quoteExpiresAt ?? null);
    this.preferenceId.set(response.preferenceId);
    this.initPoint.set(response.initPoint);

    if (this.deliveryMethod() === 'STORE_PICKUP' && response.payableNow) {
      this.redirectToMercadoPago();
      return;
    }

    if (response.requiresShippingQuote && !response.payableNow) {
      this.checkoutState.set('SHIPPING_QUOTE_REQUESTED');
      this.orderStatusLabel.set('Cotización solicitada');

      const orderId = this.currentOrderId();
      if (orderId) {
        this.startOrderPolling(orderId);
      }
      return;
    }

    if (this.deliveryMethod() === 'SHIPPING' && response.payableNow) {
      this.checkoutState.set('QUOTE_READY_PAYMENT_PENDING');
      this.startQuoteDeadlineCountdown(response.quoteExpiresAt ?? null);
      this.orderStatusLabel.set('La cotización ya está lista. Podés pagar ahora.');
      return;
    }

    this.checkoutState.set('CHECKOUT_READY');
  }

  private resumePendingOrderFlow(): void {
    const pendingOrderId = this.checkoutService.getPendingOrderId();
    if (!pendingOrderId) return;

    this.currentOrderId.set(pendingOrderId);
    this.ordersService.getMyOrderById(pendingOrderId).subscribe({
      next: (order) => {
        if (this.isTerminalOrder(order) || !this.matchesCurrentCart(order)) {
          this.checkoutService.clearPendingOrderId();
          this.currentOrderId.set(null);
          this.resumedOrderNotice.set(null);
          this.checkoutState.set('CHECKOUT_READY');
          this.orderStatusLabel.set('');
          this.payableNow.set(false);
          this.checkoutUrl.set(null);
          this.quoteExpiresAt.set(null);
          this.quoteTimeLeftLabel.set('');
          this.preferenceId.set(null);
          this.initPoint.set(null);
          this.stopOrderPolling();
          this.stopQuoteDeadlineCountdown();
          return;
        }

        this.deliveryMethod.set(order.deliveryMethod === 'SHIPPING' ? 'SHIPPING' : 'STORE_PICKUP');
        this.resumedOrderNotice.set(
          `Reanudamos tu checkout pendiente de la orden #${order.id}. Si querés iniciar una solicitud nueva, cambiá el método de entrega.`,
        );

        this.applyOrderStatus(order);

        if (order.requiresShippingQuote && !order.payableNow) {
          this.startOrderPolling(order.id);
        }
      },
      error: () => {
        this.checkoutService.clearPendingOrderId();
        this.resumedOrderNotice.set(null);
      },
    });
  }

  private applyOrderStatus(order: OrderResponse): void {
    this.currentOrderId.set(order.id);
    this.payableNow.set(Boolean(order.payableNow));
    this.checkoutUrl.set(order.checkoutUrl ?? null);
    this.quoteExpiresAt.set(order.quoteExpiresAt ?? null);
    this.preferenceId.set(order.preferenceId ?? null);
    this.initPoint.set(order.initPoint ?? null);

    const normalizedStatus = (order.status ?? '').toUpperCase();
    const normalizedPaymentStatus = (order.paymentStatus ?? '').toUpperCase();

    if (normalizedStatus === 'PAID' || normalizedPaymentStatus === 'PAID') {
      this.checkoutState.set('PAID');
      this.orderStatusLabel.set('Pago confirmado.');
      this.checkoutService.clearPendingOrderId();
      this.stopOrderPolling();
      this.stopQuoteDeadlineCountdown();
      return;
    }

    if (normalizedStatus === 'CANCELLED' || normalizedPaymentStatus === 'CANCELLED') {
      this.checkoutState.set('CANCELLED');
      this.orderStatusLabel.set('La orden fue cancelada.');
      this.checkoutService.clearPendingOrderId();
      this.stopOrderPolling();
      this.stopQuoteDeadlineCountdown();
      return;
    }

    if (order.requiresShippingQuote && !order.payableNow) {
      this.checkoutState.set('SHIPPING_QUOTE_REQUESTED');
      this.orderStatusLabel.set('Cotización solicitada. Estamos esperando al administrador.');
      return;
    }

    if (order.deliveryMethod === 'SHIPPING' && order.payableNow) {
      this.checkoutState.set('QUOTE_READY_PAYMENT_PENDING');
      this.startQuoteDeadlineCountdown(order.quoteExpiresAt ?? null);
      this.orderStatusLabel.set('Cotización lista. Ya podés pagar.');
      return;
    }

    this.checkoutState.set('CHECKOUT_READY');
    this.stopQuoteDeadlineCountdown();
  }

  private startOrderPolling(orderId: number): void {
    this.stopOrderPolling();

    this.orderPollingSubscription = interval(this.pollingIntervalMs)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.ordersService.getMyOrderById(orderId).pipe(
            catchError(() => {
              return of(null);
            }),
          ),
        ),
      )
      .subscribe((order) => {
        if (!order) return;

        this.applyOrderStatus(order);

        if (order.payableNow || order.status === 'PAID' || order.status === 'CANCELLED') {
          this.stopOrderPolling();
        }
      });
  }

  private stopOrderPolling(): void {
    this.orderPollingSubscription?.unsubscribe();
    this.orderPollingSubscription = null;
  }

  private startRetryCountdown(seconds: number): void {
    this.stopRetryCountdown();
    this.retryAfterSeconds.set(seconds);

    this.retryCountdownSubscription = interval(1000).subscribe(() => {
      const next = this.retryAfterSeconds() - 1;
      this.retryAfterSeconds.set(Math.max(0, next));
      if (next <= 0) {
        this.stopRetryCountdown();
      }
    });
  }

  private stopRetryCountdown(): void {
    this.retryCountdownSubscription?.unsubscribe();
    this.retryCountdownSubscription = null;
  }

  private redirectToMercadoPago(): void {
    const target = this.resolveMercadoPagoTarget();
    if (!target) {
      this.toast.error(
        'Aun no tenemos el enlace de pago. Esperá unos segundos e intentá nuevamente.',
      );
      return;
    }

    window.location.href = target;
  }

  private resolveMercadoPagoTarget(): string | null {
    const directCheckoutUrl = this.checkoutUrl();
    if (directCheckoutUrl) return directCheckoutUrl;

    const directInitPoint = this.initPoint();
    if (directInitPoint) return directInitPoint;

    const prefId = this.preferenceId();
    if (!prefId) return null;

    return `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${encodeURIComponent(prefId)}`;
  }

  private hasMercadoPagoTarget(): boolean {
    return Boolean(this.resolveMercadoPagoTarget());
  }

  private startQuoteDeadlineCountdown(expiresAt: string | null): void {
    this.stopQuoteDeadlineCountdown();
    if (!expiresAt) {
      this.quoteTimeLeftLabel.set('');
      return;
    }

    const deadline = new Date(expiresAt).getTime();
    if (!Number.isFinite(deadline)) {
      this.quoteTimeLeftLabel.set('');
      return;
    }

    const update = () => {
      const diffMs = deadline - Date.now();
      if (diffMs <= 0) {
        this.quoteTimeLeftLabel.set('Vencida');
        this.stopQuoteDeadlineCountdown();
        return;
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (hours > 0) {
        this.quoteTimeLeftLabel.set(
          `Vence en ${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`,
        );
        return;
      }

      this.quoteTimeLeftLabel.set(`Vence en ${minutes}m ${String(seconds).padStart(2, '0')}s`);
    };

    update();
    this.quoteDeadlineSubscription = interval(1000).subscribe(() => update());
  }

  private stopQuoteDeadlineCountdown(): void {
    this.quoteDeadlineSubscription?.unsubscribe();
    this.quoteDeadlineSubscription = null;
  }

  private computeCartWeight() {
    const items = this.cartService.items();

    if (items.length === 0) {
      return of(0);
    }

    return forkJoin(
      items.map((item) =>
        this.productService.getById(item.productId).pipe(
          map((product) => (Number(product.weight) || 0) * item.quantity),
          catchError(() => of(0)),
        ),
      ),
    ).pipe(map((weights) => weights.reduce((acc, value) => acc + value, 0)));
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

  private isTerminalOrder(order: OrderResponse): boolean {
    const status = (order.status ?? '').toUpperCase();
    const paymentStatus = (order.paymentStatus ?? '').toUpperCase();
    return (
      status === 'CANCELLED' ||
      status === 'PAID' ||
      status === 'DELIVERED' ||
      status === 'PICKED_UP' ||
      paymentStatus === 'CANCELLED' ||
      paymentStatus === 'PAID'
    );
  }

  private matchesCurrentCart(order: OrderResponse): boolean {
    const cartItems = this.cartService.items();
    if (cartItems.length === 0) return false;

    const cartSignature = cartItems
      .map((item) => `${item.productId}:${item.quantity}`)
      .sort()
      .join('|');

    const orderSignature = (order.items ?? [])
      .map((item) => `${item.productId}:${item.quantity}`)
      .sort()
      .join('|');

    return cartSignature.length > 0 && cartSignature === orderSignature;
  }

  private validateShippingAddress(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (trimmed.length < 8) {
      return 'La dirección debe tener al menos 8 caracteres.';
    }

    if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(trimmed) || !/\d/.test(trimmed)) {
      return 'Ingresá una dirección real con calle y numeración.';
    }

    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s.,#-]+$/.test(trimmed)) {
      return 'La dirección contiene caracteres no válidos.';
    }

    return null;
  }

  private validateZipCode(value: string): string | null {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) return null;

    const argentinaZipPattern = /^(?:\d{4}|[A-Z]\d{4}[A-Z]{3})$/;
    if (!argentinaZipPattern.test(trimmed)) {
      return 'Ingresá un código postal válido (1234 o A1234ABC).';
    }

    return null;
  }

  private isValidShippingAddress(value: string): boolean {
    return this.validateShippingAddress(value) === null;
  }

  private isValidZipCode(value: string): boolean {
    return this.validateZipCode(value) === null;
  }
}
