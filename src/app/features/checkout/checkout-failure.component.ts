import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CheckoutService } from './services/checkout.service';
import { OrdersService } from '../orders/services/orders.service';
import { OrderResponse } from '../admin/models/admin.models';

@Component({
  selector: 'app-checkout-failure',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="min-h-screen flex flex-col items-center justify-center text-center px-4">
      @if (loading()) {
        <div
          class="w-10 h-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin mb-6"
        ></div>
        <p class="text-brand-gray mb-8 max-w-md">Consultando estado real de la orden...</p>
      } @else if (error()) {
        <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 mb-8 max-w-lg">
          <p class="text-sm text-red-700">{{ error() }}</p>
        </div>
      } @else if (isPaid()) {
        <div class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
          <svg
            class="w-10 h-10 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 class="text-3xl mb-3">Pago confirmado</h1>
        <p class="text-brand-gray mb-8 max-w-md">
          Aunque el redirect indicó fallo, el backend confirma que la orden ya está pagada.
        </p>
      } @else {
        <div class="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
          <svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 class="text-3xl mb-3">Pago no confirmado</h1>
        <p class="text-brand-gray mb-8 max-w-md">
          Revisá el estado de la orden. Si ya está habilitada para pago, podés retomar desde
          checkout.
        </p>
      }

      @if (order()) {
        <p class="text-sm text-brand-gray mb-8 max-w-md">
          Orden #{{ order()!.id }} • Estado: {{ order()!.status }} • Pago:
          {{ order()!.paymentStatus || '-' }}
        </p>
      }

      <div class="flex flex-col sm:flex-row items-center gap-4">
        <a
          routerLink="/checkout"
          class="inline-block px-6 py-3 bg-brand-black text-brand-white font-display uppercase tracking-widest text-sm rounded-lg hover:bg-brand-dark transition-colors"
        >
          Reintentar pago
        </a>
        <a
          routerLink="/catalog"
          class="inline-block px-6 py-3 border border-gray-300 text-brand-black font-display uppercase tracking-widest text-sm rounded-lg hover:bg-gray-50 transition-colors"
        >
          Volver al catálogo
        </a>
      </div>
    </section>
  `,
})
export class CheckoutFailureComponent implements OnInit {
  private readonly checkoutService = inject(CheckoutService);
  private readonly ordersService = inject(OrdersService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly order = signal<OrderResponse | null>(null);

  readonly isPaid = computed(() => {
    const currentOrder = this.order();
    if (!currentOrder) return false;
    return (
      (currentOrder.status ?? '').toUpperCase() === 'PAID' ||
      (currentOrder.paymentStatus ?? '').toUpperCase() === 'PAID'
    );
  });

  readonly isCancelled = computed(() => {
    const currentOrder = this.order();
    if (!currentOrder) return false;
    return (
      (currentOrder.status ?? '').toUpperCase() === 'CANCELLED' ||
      (currentOrder.paymentStatus ?? '').toUpperCase() === 'CANCELLED'
    );
  });

  ngOnInit(): void {
    this.refreshOrderState();
  }

  private refreshOrderState(): void {
    const orderId = this.checkoutService.getReturnOrderId(this.route.snapshot.queryParamMap);
    if (!orderId) {
      this.loading.set(false);
      this.error.set('No encontramos una orden pendiente para validar este pago.');
      return;
    }

    this.ordersService.getMyOrderById(orderId).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);

        if (this.isPaid() || this.isCancelled()) {
          this.checkoutService.clearPendingOrderId();
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No pudimos consultar el estado real de la orden.');
      },
    });
  }
}
