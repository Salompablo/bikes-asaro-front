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
    <div class="page page--narrow min-h-[calc(100vh-var(--header-h))]">
      @if (loading()) {
        <div class="panel state" aria-live="polite">
          <span class="spinner spinner--lg"></span>
          <p class="text-lg font-semibold">Estamos confirmando tu pago...</p>
          <p class="text-brand-gray">No cierres esta pestaña, tarda unos segundos.</p>
        </div>
      } @else if (error()) {
        <div class="panel state">
          <h1 class="text-3xl">No pudimos confirmar el pago</h1>
          <div class="notice notice--error w-full">
            <p>{{ error() }}</p>
          </div>
          <p class="text-brand-gray">
            Si el dinero se debitó, no te preocupes: revisá tus pedidos o escribinos y lo resolvemos.
          </p>
          <div class="mt-2 flex flex-wrap gap-3">
            <a routerLink="/orders" class="btn btn--dark">Ver mis pedidos</a>
            <a routerLink="/contacto" class="btn btn--outline">Escribirnos</a>
          </div>
        </div>
      } @else if (order()) {
        <div class="result-head">
          <span class="result-mark result-mark--ok" aria-hidden="true">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <div>
            <h1 class="page-title">Pago confirmado</h1>
            <p class="page-lede">
              Tu pedido #{{ order()!.id }} ya está en marcha. Te avisamos cuando esté listo.
            </p>
          </div>
        </div>

        <div class="panel panel-pad mt-8">
          <dl>
            <div class="data-row">
              <dt>Pedido</dt>
              <dd>#{{ order()!.id }}</dd>
            </div>
            <div class="data-row">
              <dt>Estado</dt>
              <dd>{{ statusLabel(order()!.status) }}</dd>
            </div>
            <div class="data-row">
              <dt>Pago</dt>
              <dd>{{ paymentStatusLabel(order()!.paymentStatus) }}</dd>
            </div>
            <div class="data-row">
              <dt>Entrega</dt>
              <dd>{{ deliveryMethodLabel(order()!.deliveryMethod) }}</dd>
            </div>
            <div class="data-row">
              <dt>Fecha</dt>
              <dd>{{ order()!.createdAt | date: 'dd/MM/yyyy HH:mm' }}</dd>
            </div>
          </dl>

          <h2 class="panel-title mt-8">Productos</h2>
          <ul class="mt-3">
            @for (item of order()!.items; track item.productId) {
              <li class="data-row">
                <span>{{ item.quantity }} × {{ item.productName }}</span>
                <span>{{ item.unitPrice * item.quantity | currency: 'ARS' : '$' : '1.0-0' }}</span>
              </li>
            }
          </ul>

          <dl class="mt-4 border-t-2 border-brand-black pt-2">
            <div class="data-row">
              <dt>Subtotal</dt>
              <dd>{{ order()!.subtotalAmount ?? 0 | currency: 'ARS' : '$' : '1.0-0' }}</dd>
            </div>
            <div class="data-row">
              <dt>Envío</dt>
              <dd>{{ order()!.shippingCost ?? 0 | currency: 'ARS' : '$' : '1.0-0' }}</dd>
            </div>
            <div class="data-row text-lg">
              <dt class="!text-brand-black font-bold">Total</dt>
              <dd>{{ order()!.totalAmount | currency: 'ARS' : '$' : '1.0-0' }}</dd>
            </div>
          </dl>
        </div>

        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
          <a [routerLink]="['/orders', order()!.id]" class="btn btn--primary btn--lg">Seguir mi pedido</a>
          <a routerLink="/catalog" class="btn btn--outline btn--lg">Seguir comprando</a>
        </div>
      }
    </div>
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
