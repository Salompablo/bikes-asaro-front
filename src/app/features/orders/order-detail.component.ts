import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { OrderResponse } from '../admin/models/admin.models';
import { OrdersService } from './services/orders.service';

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  INITIATED: { label: 'Iniciado', classes: 'bg-slate-100 text-slate-700' },
  QUOTE_REQUESTED: { label: 'Esperando cotización', classes: 'bg-orange-100 text-orange-800' },
  QUOTE_READY_PAYMENT_PENDING: {
    label: 'Cotización publicada',
    classes: 'bg-cyan-100 text-cyan-800',
  },
  PENDING: { label: 'Pendiente de confirmacion', classes: 'bg-yellow-100 text-yellow-800' },
  PAID: { label: 'Pago confirmado', classes: 'bg-blue-100 text-blue-800' },
  READY_FOR_PICKUP: { label: 'Listo para retirar', classes: 'bg-green-100 text-green-800' },
  PICKED_UP: { label: 'Retirado', classes: 'bg-gray-100 text-gray-700' },
  SHIPPED: { label: 'Enviado', classes: 'bg-indigo-100 text-indigo-800' },
  DELIVERED: { label: 'Entregado', classes: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Cancelado', classes: 'bg-red-100 text-red-700' },
};

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, NgClass],
  template: `
    <div class="page">
      <a routerLink="/orders" class="inline-flex items-center gap-2 text-sm font-semibold text-brand-gray hover:text-brand-black">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Mis pedidos
      </a>

      @if (loading()) {
        <div class="mt-6 grid gap-6 xl:grid-cols-[1fr_22rem]">
          <div class="skeleton h-96"></div>
          <div class="skeleton h-64"></div>
        </div>
      } @else if (notFound()) {
        <div class="panel state mt-6">
          <p class="text-xl font-semibold">No encontramos este pedido</p>
          <p class="text-brand-gray">Puede que el número esté mal o que el pedido sea de otra cuenta.</p>
          <a routerLink="/orders" class="btn btn--dark mt-2">Ver mis pedidos</a>
        </div>
      } @else if (error()) {
        <div class="notice notice--error mt-6" role="alert">
          <div class="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>No pudimos cargar este pedido. Revisá tu conexión y probá de nuevo.</p>
            <button type="button" (click)="load()" class="btn btn--outline btn--sm">Reintentar</button>
          </div>
        </div>
      } @else if (order()) {
        <div class="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 class="page-title">Pedido #{{ order()!.id }}</h1>
            <p class="mt-2 text-brand-gray">Hecho el {{ order()!.createdAt | date: 'd/MM/yyyy, HH:mm' }}</p>
          </div>
          <span class="badge text-sm" [ngClass]="statusConfig(order()!.status).classes">
            {{ statusConfig(order()!.status).label }}
          </span>
        </div>

        <div class="mt-8 grid items-start gap-6 xl:grid-cols-[1fr_22rem]">
          <div class="space-y-6">
            <section class="panel panel-pad" aria-labelledby="od-progress">
              <h2 id="od-progress" class="panel-title">Seguimiento</h2>

              @if (order()!.status === 'CANCELLED') {
                <div class="notice notice--error mt-4"><p>Este pedido se canceló.</p></div>
              } @else {
                <ol class="od-steps mt-5">
                  @for (step of orderSteps(); track step; let i = $index) {
                    <li
                      class="od-step"
                      [class.od-step--done]="i < currentStepIndex()"
                      [class.od-step--current]="i === currentStepIndex()"
                      [attr.aria-current]="i === currentStepIndex() ? 'step' : null"
                    >
                      <span class="od-step__bar" aria-hidden="true"></span>
                      <span class="od-step__label">{{ step }}</span>
                    </li>
                  }
                </ol>
              }

              @if (order()!.requiresShippingQuote) {
                <div class="notice notice--info mt-5">
                  <p>Estamos cotizando el envío. Te avisamos cuando puedas pagar.</p>
                </div>
              }

              @if (canRenderPayNow(order()!)) {
                <div class="mt-5 flex flex-wrap items-center gap-4">
                  <button type="button" (click)="payNow()" class="btn btn--mp">Pagar con Mercado Pago</button>
                  @if (showQuoteDeadline(order()!)) {
                    <div class="text-sm">
                      <p class="text-brand-gray">Válido hasta el {{ formatQuoteDeadline(order()!) }}</p>
                      <p class="font-semibold text-brand-red">{{ quoteCountdownLabel(order()!) }}</p>
                    </div>
                  }
                </div>
              }
            </section>

            <section class="panel panel-pad" aria-labelledby="od-items">
              <h2 id="od-items" class="panel-title">Productos</h2>
              <ul class="mt-2">
                @for (item of order()!.items; track item.productId) {
                  <li class="flex items-center gap-4 border-b border-brand-line py-4 last:border-b-0 last:pb-0">
                    <a
                      [routerLink]="['/products', item.productId]"
                      class="h-20 w-20 shrink-0 overflow-hidden rounded border border-brand-line bg-white"
                      [attr.aria-label]="'Ver ' + item.productName"
                    >
                      @if (item.imageUrl) {
                        <img
                          [src]="item.imageUrl"
                          alt=""
                          class="h-full w-full object-contain p-1"
                          loading="lazy"
                          (error)="onImageError($event)"
                        />
                      } @else {
                        <span class="flex h-full w-full items-center justify-center px-2 text-center text-xs text-brand-gray">
                          Sin foto
                        </span>
                      }
                    </a>
                    <div class="min-w-0 flex-1">
                      <a [routerLink]="['/products', item.productId]" class="font-semibold hover:underline">
                        {{ item.productName }}
                      </a>
                      <p class="mt-1 text-sm text-brand-gray">
                        {{ item.quantity }} × {{ item.unitPrice | currency: 'ARS' : '$' : '1.0-0' }}
                      </p>
                    </div>
                    <p class="font-bold tabular-nums">
                      {{ item.unitPrice * item.quantity | currency: 'ARS' : '$' : '1.0-0' }}
                    </p>
                  </li>
                }
              </ul>
            </section>
          </div>

          <aside class="space-y-6">
            <section class="panel panel-pad" aria-labelledby="od-summary">
              <h2 id="od-summary" class="panel-title">Resumen</h2>
              <dl class="mt-3">
                <div class="data-row">
                  <dt>Productos</dt>
                  <dd>{{ itemsSubtotal() | currency: 'ARS' : '$' : '1.0-0' }}</dd>
                </div>
                <div class="data-row">
                  <dt>Envío</dt>
                  <dd>{{ order()!.shippingCost | currency: 'ARS' : '$' : '1.0-0' }}</dd>
                </div>
              </dl>
              <div class="mt-2 flex items-center justify-between border-t-2 border-brand-black pt-3">
                <span class="font-bold">Total</span>
                <span class="price-tag text-xl">
                  {{ order()!.totalAmount | currency: 'ARS' : '$' : '1.0-0' }}
                </span>
              </div>
            </section>

            <section class="panel panel-pad" aria-labelledby="od-delivery">
              <h2 id="od-delivery" class="panel-title">Entrega</h2>
              <dl class="mt-3">
                <div class="data-row">
                  <dt>Método</dt>
                  <dd>{{ deliveryMethodLabel(order()!.deliveryMethod) }}</dd>
                </div>
                @if (order()!.deliveryMethod === 'SHIPPING') {
                  <div class="data-row">
                    <dt>Dirección</dt>
                    <dd>{{ order()!.shippingAddress || '-' }}</dd>
                  </div>
                  <div class="data-row">
                    <dt>Código postal</dt>
                    <dd>{{ order()!.zipCode || '-' }}</dd>
                  </div>
                }
                <div class="data-row">
                  <dt>Teléfono</dt>
                  <dd>{{ order()!.contactPhone || '-' }}</dd>
                </div>
              </dl>
              <p class="mt-4 text-sm text-brand-gray">
                ¿Algo no está bien?
                <a routerLink="/contacto" class="text-link">Escribinos</a>
                con el número de pedido.
              </p>
            </section>
          </aside>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .od-steps {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem 0.5rem;
      }
      @media (min-width: 640px) {
        .od-steps {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }
      .od-step__bar {
        display: block;
        height: 6px;
        border-radius: 2px;
        background: var(--line);
        transform: skewX(var(--slant));
      }
      .od-step__label {
        display: block;
        margin-top: 0.6rem;
        font-size: 0.875rem;
        color: var(--muted);
      }
      .od-step--done .od-step__bar {
        background: var(--ink);
      }
      .od-step--done .od-step__label {
        color: var(--ink);
      }
      .od-step--current .od-step__bar {
        background: var(--yellow);
        box-shadow: inset 0 0 0 1px var(--ink);
      }
      .od-step--current .od-step__label {
        color: var(--ink);
        font-weight: 700;
      }
    `,
  ],
})
export class OrderDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ordersService = inject(OrdersService);
  private quoteCountdownTimer: ReturnType<typeof setInterval> | null = null;

  readonly order = signal<OrderResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly notFound = signal(false);
  readonly now = signal(Date.now());

  readonly itemsSubtotal = computed(() => {
    const currentOrder = this.order();
    if (!currentOrder) return 0;

    return currentOrder.items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  });

  readonly paymentUrl = computed(() => {
    const currentOrder = this.order();
    if (!currentOrder || !currentOrder.payableNow) return null;

    if (currentOrder.checkoutUrl) return currentOrder.checkoutUrl;
    if (currentOrder.initPoint) return currentOrder.initPoint;
    if (currentOrder.preferenceId) {
      return `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${encodeURIComponent(currentOrder.preferenceId)}`;
    }

    return null;
  });

  readonly currentStepIndex = computed(() => {
    const currentOrder = this.order();
    if (!currentOrder) return 0;

    if (currentOrder.status === 'QUOTE_REQUESTED') return 0;
    if (currentOrder.status === 'QUOTE_READY_PAYMENT_PENDING') return 1;

    const pickupStatusStepMap: Record<string, number> = {
      PENDING: 0,
      PAID: 1,
      READY_FOR_PICKUP: 2,
      PICKED_UP: 3,
    };

    const shippingStatusStepMap: Record<string, number> = {
      PENDING: 0,
      PAID: 1,
      SHIPPED: 2,
      DELIVERED: 3,
    };

    const statusMap =
      currentOrder.deliveryMethod === 'SHIPPING' ? shippingStatusStepMap : pickupStatusStepMap;
    return statusMap[currentOrder.status] ?? 0;
  });

  readonly orderSteps = computed(() => {
    const currentOrder = this.order();
    if (!currentOrder) return [] as string[];

    if (currentOrder.deliveryMethod === 'SHIPPING') {
      return ['Cotización', 'Pago', 'Enviado', 'Entregado'];
    }

    return ['Confirmado', 'Pago', 'Listo para retirar', 'Retirado'];
  });

  ngOnInit(): void {
    this.quoteCountdownTimer = setInterval(() => this.now.set(Date.now()), 1000);
    this.load();
  }

  ngOnDestroy(): void {
    if (this.quoteCountdownTimer) {
      clearInterval(this.quoteCountdownTimer);
      this.quoteCountdownTimer = null;
    }
  }

  load(): void {
    const orderId = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isFinite(orderId) || orderId <= 0) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(false);
    this.notFound.set(false);

    this.ordersService.getMyOrderById(orderId).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);

        if (err.status === 401 || err.status === 403) {
          this.router.navigate(['/auth/login'], {
            queryParams: { returnUrl: `/orders/${orderId}` },
          });
          return;
        }

        if (err.status === 404) {
          this.notFound.set(true);
          return;
        }

        this.error.set(true);
      },
    });
  }

  statusConfig(status: string): { label: string; classes: string } {
    return STATUS_CONFIG[status] ?? { label: status, classes: 'bg-gray-100 text-gray-600' };
  }

  canRenderPayNow(order: OrderResponse): boolean {
    const allowedStatuses = new Set(['INITIATED', 'QUOTE_READY_PAYMENT_PENDING']);
    return (
      Boolean(order.payableNow) && allowedStatuses.has(order.status) && Boolean(this.paymentUrl())
    );
  }

  showQuoteDeadline(order: OrderResponse): boolean {
    return Boolean(order.quoteExpiresAt) && order.status === 'QUOTE_READY_PAYMENT_PENDING';
  }

  formatQuoteDeadline(order: OrderResponse): string {
    if (!order.quoteExpiresAt) return '-';
    const parsed = new Date(order.quoteExpiresAt);
    if (!Number.isFinite(parsed.getTime())) return '-';
    return parsed.toLocaleString('es-AR', { hour12: false });
  }

  quoteCountdownLabel(order: OrderResponse): string {
    const now = this.now();
    if (!order.quoteExpiresAt) return '';

    const expiresAt = new Date(order.quoteExpiresAt).getTime();
    if (!Number.isFinite(expiresAt)) return '';

    const diffMs = expiresAt - now;
    if (diffMs <= 0) return 'Cotización vencida';

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `Vence en ${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
    }

    return `Vence en ${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }

  deliveryMethodLabel(method: string): string {
    if (method === 'SHIPPING') return 'Envio a domicilio';
    if (method === 'STORE_PICKUP') return 'Retiro en tienda';
    return method;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = '/assets/images/bikes-asaro-logo.png';
  }

  payNow(): void {
    const url = this.paymentUrl();
    if (!url) return;
    window.location.href = url;
  }
}
