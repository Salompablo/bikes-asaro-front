import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CartStateService } from '../../core/services/cart-state.service';
import { CheckoutService } from './services/checkout.service';
import { OrdersService } from '../orders/services/orders.service';
import { OrderResponse } from '../admin/models/admin.models';

@Component({
  selector: 'app-checkout-success',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="min-h-screen bg-brand-light flex items-center justify-center px-4 py-10">
      <div
        class="w-full max-w-lg rounded-2xl bg-brand-white border border-gray-200 shadow-xl p-6 sm:p-8"
      >
        @if (loading()) {
          <div class="flex items-center justify-center py-12">
            <div
              class="w-10 h-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"
            ></div>
          </div>
        } @else if (error()) {
          <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 mb-6">
            <p class="text-sm text-red-700 text-center">{{ error() }}</p>
          </div>
        } @else if (isPaid()) {
          <div
            class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
          >
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
          <h1 class="text-3xl text-center mb-3">Pago confirmado</h1>
          <p class="text-brand-gray text-center mb-4">
            Confirmamos el pago y tu pedido ya está en proceso.
          </p>
        } @else if (isCancelled()) {
          <div
            class="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6"
          >
            <svg
              class="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 class="text-3xl text-center mb-3">Orden cancelada</h1>
          <p class="text-brand-gray text-center mb-4">
            El backend indica que la orden fue cancelada. Podés iniciar un nuevo checkout.
          </p>
        } @else {
          <div
            class="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-6"
          >
            <svg
              class="w-10 h-10 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3"
              />
            </svg>
          </div>
          <h1 class="text-3xl text-center mb-3">Pago en verificación</h1>
          <p class="text-brand-gray text-center mb-4">
            @if (polling()) {
              Verificando el pago con Mercado Pago...
            } @else {
              El redirect fue exitoso pero el pago todavía no fue confirmado por el backend. Revisá
              el estado de tu pedido en unos minutos.
            }
          </p>
          @if (polling()) {
            <div class="flex justify-center mb-4">
              <div
                class="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"
              ></div>
            </div>
          }
        }

        @if (order()) {
          <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 mb-8">
            <p class="text-sm text-brand-gray text-center">
              Orden #{{ order()!.id }} • Estado: {{ statusLabel(order()!.status) }} • Pago:
              {{ order()!.paymentStatus ? statusLabel(order()!.paymentStatus!) : '-' }}
            </p>
          </div>
        }

        <div class="flex flex-col sm:flex-row gap-3">
          <a
            routerLink="/catalog"
            class="flex-1 inline-flex items-center justify-center px-6 py-3 bg-brand-black text-brand-white font-display uppercase tracking-widest text-sm rounded-lg hover:bg-brand-dark transition-colors"
          >
            Seguir comprando
          </a>
          <a
            routerLink="/orders"
            class="flex-1 inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-brand-black font-display uppercase tracking-widest text-sm rounded-lg hover:bg-gray-50 transition-colors"
          >
            Ver mis pedidos
          </a>
        </div>
      </div>
    </section>
  `,
})
export class CheckoutSuccessComponent implements OnInit, OnDestroy {
  private readonly cartService = inject(CartStateService);
  private readonly checkoutService = inject(CheckoutService);
  private readonly ordersService = inject(OrdersService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly order = signal<OrderResponse | null>(null);
  readonly polling = signal(false);

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private pollAttempts = 0;
  private readonly maxPollAttempts = 15; // 15 × 3s = 45 segundos máx

  readonly isPaid = computed(() => {
    const currentOrder = this.order();
    if (!currentOrder) return false;

    const orderStatus = (currentOrder.status ?? '').toUpperCase();
    const paymentStatus = (currentOrder.paymentStatus ?? '').toUpperCase();
    return orderStatus === 'PAID' || paymentStatus === 'PAID';
  });

  readonly isCancelled = computed(() => {
    const currentOrder = this.order();
    if (!currentOrder) return false;

    const orderStatus = (currentOrder.status ?? '').toUpperCase();
    const paymentStatus = (currentOrder.paymentStatus ?? '').toUpperCase();
    return orderStatus === 'CANCELLED' || paymentStatus === 'CANCELLED';
  });

  ngOnInit(): void {
    this.refreshOrderState();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  statusLabel(status: string): string {
    const normalizedStatus = (status ?? '').toUpperCase();
    const labels: Record<string, string> = {
      INITIATED: 'Iniciada',
      QUOTE_REQUESTED: 'Cotización solicitada',
      QUOTE_READY_PAYMENT_PENDING: 'Cotización publicada',
      PENDING: 'Pendiente',
      APPROVED: 'Aprobado',
      AUTHORIZED: 'Autorizado',
      IN_PROCESS: 'En proceso',
      REJECTED: 'Rechazado',
      CANCELLED: 'Cancelada',
      REFUNDED: 'Reembolsado',
      CHARGED_BACK: 'Contracargado',
      PAID: 'Pagada',
      READY_FOR_PICKUP: 'Lista para retirar',
      PICKED_UP: 'Retirada',
      SHIPPED: 'Enviada',
      DELIVERED: 'Entregada',
    };
    return labels[normalizedStatus] ?? status;
  }

  private stopPolling(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private startPolling(orderId: number): void {
    this.polling.set(true);
    this.pollTimer = setInterval(() => {
      this.pollAttempts++;
      this.ordersService.getMyOrderById(orderId).subscribe({
        next: (order) => {
          this.order.set(order);
          if (this.isPaid() || this.isCancelled()) {
            this.stopPolling();
            this.polling.set(false);
            if (this.isPaid()) {
              this.cartService.clearCart();
              this.checkoutService.clearPendingOrderId();
            } else {
              this.checkoutService.clearPendingOrderId();
            }
          } else if (this.pollAttempts >= this.maxPollAttempts) {
            this.stopPolling();
            this.polling.set(false);
          }
        },
        error: () => {
          this.stopPolling();
          this.polling.set(false);
        },
      });
    }, 3000);
  }

  private refreshOrderState(): void {
    const orderId = this.checkoutService.getReturnOrderId(this.route.snapshot.queryParamMap);
    if (!orderId) {
      this.loading.set(false);
      this.error.set('No encontramos una orden asociada a este retorno de pago.');
      return;
    }

    this.ordersService.getMyOrderById(orderId).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);

        if (this.isPaid()) {
          this.cartService.clearCart();
          this.checkoutService.clearPendingOrderId();
        } else if (this.isCancelled()) {
          this.checkoutService.clearPendingOrderId();
        } else {
          // Pago aún no reflejado — hacer polling hasta que el webhook llegue al backend
          this.startPolling(orderId);
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No pudimos validar el estado de tu orden desde el backend.');
      },
    });
  }
}
