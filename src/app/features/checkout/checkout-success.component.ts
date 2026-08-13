import { CurrencyPipe, DatePipe, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CartStateService } from '../../core/services/cart-state.service';
import { AuthService } from '../auth/services/auth.service';
import { OrderResponse } from '../admin/models/admin.models';
import { CheckoutService, MercadoPagoReturnParams } from './services/checkout.service';

@Component({
  selector: 'app-checkout-success',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink],
  template: `
    <section class="min-h-screen bg-brand-light flex items-center justify-center px-4 py-10">
      <div
        class="w-full max-w-2xl rounded-2xl bg-brand-white border border-gray-200 shadow-xl p-6 sm:p-8"
      >
        @if (loading()) {
          <div class="flex flex-col items-center justify-center py-14 text-center gap-4">
            <div
              class="w-10 h-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"
            ></div>
            <p class="text-brand-gray">Confirmando tu pago...</p>
          </div>
        } @else if (error()) {
          <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 mb-6">
            <p class="text-sm text-red-700 text-center">{{ error() }}</p>
          </div>
          <div class="flex justify-center">
            <a
              routerLink="/"
              class="inline-flex items-center justify-center px-6 py-3 bg-brand-black text-brand-white font-display uppercase tracking-widest text-sm rounded-lg hover:bg-brand-dark transition-colors"
            >
              Ir al inicio
            </a>
          </div>
        } @else if (order()) {
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
            Confirmamos tu pago y actualizamos el estado de la orden.
          </p>

          <div class="rounded-2xl border border-gray-200 bg-gray-50 p-5 mb-8 space-y-5">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <p class="text-xs uppercase tracking-[0.2em] text-brand-gray mb-1">Orden</p>
                <p class="text-xl font-semibold text-brand-black">#{{ order()!.id }}</p>
              </div>
              <div class="sm:text-right">
                <p class="text-xs uppercase tracking-[0.2em] text-brand-gray mb-1">Estado</p>
                <p class="text-xl font-semibold text-brand-black">
                  {{ statusLabel(order()!.status) }}
                </p>
              </div>
              <div>
                <p class="text-xs uppercase tracking-[0.2em] text-brand-gray mb-1">Pago</p>
                <p class="text-sm text-brand-black">
                  {{ paymentStatusLabel(order()!.paymentStatus) }}
                </p>
              </div>
              <div class="sm:text-right">
                <p class="text-xs uppercase tracking-[0.2em] text-brand-gray mb-1">Entrega</p>
                <p class="text-sm text-brand-black">
                  {{ deliveryMethodLabel(order()!.deliveryMethod) }}
                </p>
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2 text-sm text-brand-gray">
              <p>Creada: {{ order()!.createdAt | date: 'dd/MM/yyyy HH:mm' }}</p>
              <p>
                Subtotal:
                {{ order()!.subtotalAmount ?? 0 | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}
              </p>
              <p>Total: {{ order()!.totalAmount | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}</p>
              <p>
                Envío:
                {{ order()!.shippingCost ?? 0 | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}
              </p>
            </div>

            <div class="space-y-3">
              <p class="text-xs uppercase tracking-[0.2em] text-brand-gray">Items</p>
              <div class="space-y-3">
                @for (item of order()!.items; track item.productId) {
                  <div class="rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <div class="flex items-start justify-between gap-4">
                      <div>
                        <p class="font-medium text-brand-black">{{ item.productName }}</p>
                        <p class="text-sm text-brand-gray">Cantidad: {{ item.quantity }}</p>
                      </div>
                      <p class="text-sm text-brand-black">
                        {{ item.unitPrice | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}
                      </p>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>

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
        }
      </div>
    </section>
  `,
})
export class CheckoutSuccessComponent implements OnInit, OnDestroy {
  private readonly cartService = inject(CartStateService);
  private readonly checkoutService = inject(CheckoutService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly order = signal<OrderResponse | null>(null);

  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.confirmCheckoutReturn();
  }

  ngOnDestroy(): void {}

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
      SHIPPING: 'Envío a domicilio',
      STORE_PICKUP: 'Retiro en tienda',
    };

    return labels[normalizedStatus] ?? status;
  }

  paymentStatusLabel(status?: string | null): string {
    if (!status) {
      return '-';
    }

    return this.statusLabel(status);
  }

  deliveryMethodLabel(method: string): string {
    return this.statusLabel(method);
  }

  private confirmCheckoutReturn(): void {
    const returnParams = this.resolveReturnParams();
    if (!returnParams) {
      this.loading.set(false);
      this.error.set('No encontramos los datos del pago para confirmar tu orden.');
      return;
    }

    if (!this.authService.isLoggedIn()) {
      this.checkoutService.storePendingMercadoPagoReturnParams(returnParams);
      void this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: '/checkout/success' },
      });
      return;
    }

    this.checkoutService
      .confirmCheckout(returnParams.collectionId, returnParams.externalReference)
      .subscribe({
        next: (order) => {
          this.order.set(order);
          this.loading.set(false);
          this.error.set(null);
          this.cartService.clearCart();
          this.checkoutService.clearPendingOrderId();
          this.checkoutService.clearStoredMercadoPagoReturnParams();
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 401 || err.status === 403) {
            this.checkoutService.storePendingMercadoPagoReturnParams(returnParams);
            void this.router.navigate(['/auth/login'], {
              queryParams: { returnUrl: '/checkout/success' },
            });
            return;
          }

          this.loading.set(false);
          this.error.set(this.getErrorMessage(err.status));

          if (err.status === 400 || err.status === 404) {
            this.checkoutService.clearStoredMercadoPagoReturnParams();
          }
        },
      });
  }

  private resolveReturnParams(): MercadoPagoReturnParams | null {
    const routeParams = this.checkoutService.getMercadoPagoReturnParams(
      this.route.snapshot.queryParamMap,
    );
    if (routeParams) {
      this.checkoutService.storePendingMercadoPagoReturnParams(routeParams);
      return routeParams;
    }

    return this.checkoutService.getStoredMercadoPagoReturnParams();
  }

  private getErrorMessage(status: number): string {
    if (status === 400) {
      return 'Hubo un problema con el pago. Por favor contactá soporte.';
    }

    if (status === 404) {
      return 'No encontramos tu orden. Por favor revisá tu historial de compras.';
    }

    if (status === 500) {
      return 'Error inesperado. Por favor intentá de nuevo más tarde.';
    }

    return 'No pudimos confirmar tu pago en este momento.';
  }
}
