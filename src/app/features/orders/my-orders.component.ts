import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrderResponse, PageMetaData } from '../admin/models/admin.models';
import { OrdersService } from './services/orders.service';

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  INITIATED: { label: 'Iniciado', classes: 'bg-slate-100 text-slate-700' },
  QUOTE_REQUESTED: { label: 'Esperando cotización', classes: 'bg-orange-100 text-orange-800' },
  QUOTE_READY_PAYMENT_PENDING: {
    label: 'Cotización lista, falta pago',
    classes: 'bg-cyan-100 text-cyan-800',
  },
  PENDING: { label: 'Pendiente de confirmación', classes: 'bg-yellow-100 text-yellow-800' },
  PAID: { label: 'Pago confirmado', classes: 'bg-blue-100 text-blue-800' },
  READY_FOR_PICKUP: { label: 'Listo para retirar', classes: 'bg-green-100 text-green-800' },
  PICKED_UP: { label: 'Retirado', classes: 'bg-gray-100 text-gray-700' },
  SHIPPED: { label: 'Enviado', classes: 'bg-indigo-100 text-indigo-800' },
  DELIVERED: { label: 'Recibido', classes: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Cancelado', classes: 'bg-red-100 text-red-700' },
};

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, NgClass],
  template: `
    <div class="page page--narrow">
      <h1 class="page-title">Mis pedidos</h1>

      @if (loading()) {
        <div class="mt-8 space-y-4">
          @for (i of [1, 2, 3]; track i) {
            <div class="skeleton h-40"></div>
          }
        </div>
      } @else if (error()) {
        <div class="notice notice--error mt-8" role="alert">
          <div class="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>No pudimos cargar tus pedidos. Revisá tu conexión y probá de nuevo.</p>
            <button type="button" (click)="load()" class="btn btn--outline btn--sm">Reintentar</button>
          </div>
        </div>
      } @else if (orders().length === 0) {
        <div class="panel state mt-8">
          <span class="state__icon" aria-hidden="true">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </span>
          <p class="text-xl font-semibold">Todavía no hiciste ningún pedido</p>
          <p class="text-brand-gray">Cuando compres algo, vas a poder seguirlo desde acá.</p>
          <a routerLink="/catalog" class="btn btn--primary mt-2">Ver el catálogo</a>
        </div>
      } @else {
        <ul class="mt-8 space-y-4">
          @for (order of orders(); track order.id) {
            <li class="panel overflow-hidden">
              <div class="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
                <div>
                  <h2 class="text-2xl">Pedido #{{ order.id }}</h2>
                  <p class="mt-1 text-sm text-brand-gray">
                    {{ order.createdAt | date: 'd MMM y, HH:mm' }}
                  </p>
                </div>
                <span class="badge" [ngClass]="statusConfig(order.status).classes">
                  {{ statusConfig(order.status).label }}
                </span>
              </div>

              <ul class="px-5 py-4">
                @for (item of order.items; track item.productId) {
                  <li class="data-row">
                    <span class="!text-brand-black">{{ item.quantity }} × {{ item.productName }}</span>
                    <span class="font-normal">
                      {{ item.unitPrice * item.quantity | currency: 'ARS' : '$' : '1.0-0' }}
                    </span>
                  </li>
                }
              </ul>

              @if (order.requiresShippingQuote || (order.payableNow && order.status === 'QUOTE_READY_PAYMENT_PENDING') || showQuoteDeadline(order)) {
                <div class="px-5 pb-4 space-y-1 text-sm">
                  @if (order.requiresShippingQuote) {
                    <p class="text-brand-gray">Estamos cotizando el envío. Te avisamos cuando esté listo.</p>
                  }
                  @if (order.payableNow && order.status === 'QUOTE_READY_PAYMENT_PENDING') {
                    <p class="font-semibold">El envío ya está cotizado, podés pagar.</p>
                  }
                  @if (showQuoteDeadline(order)) {
                    <p class="text-brand-gray">Válido hasta el {{ formatQuoteDeadline(order) }}</p>
                    <p class="font-semibold text-brand-red">{{ quoteCountdownLabel(order) }}</p>
                  }
                </div>
              }

              <div class="flex flex-wrap items-center justify-between gap-3 border-t border-brand-line bg-[#f4f5f6] px-5 py-3">
                <p>
                  <span class="text-brand-gray">Total</span>
                  <span class="ml-2 text-lg font-bold tabular-nums">
                    {{ order.totalAmount | currency: 'ARS' : '$' : '1.0-0' }}
                  </span>
                </p>
                <div class="flex items-center gap-2">
                  @if (canRenderPayNow(order)) {
                    <button type="button" (click)="payNow(order)" class="btn btn--mp btn--sm">Pagar ahora</button>
                  }
                  <a [routerLink]="['/orders', order.id]" class="btn btn--outline btn--sm">Ver detalle</a>
                </div>
              </div>
            </li>
          }
        </ul>

        @if (meta() && meta()!.totalPages > 1) {
          <nav class="mt-8 flex items-center justify-center gap-4" aria-label="Paginación">
            <button type="button" [disabled]="currentPage() === 0" (click)="goToPage(currentPage() - 1)" class="btn btn--outline btn--sm">
              Anterior
            </button>
            <span class="text-sm text-brand-gray tabular-nums">
              Página {{ currentPage() + 1 }} de {{ meta()!.totalPages }}
            </span>
            <button type="button" [disabled]="currentPage() >= meta()!.totalPages - 1" (click)="goToPage(currentPage() + 1)" class="btn btn--outline btn--sm">
              Siguiente
            </button>
          </nav>
        }
      }
    </div>
  `,
})
export class MyOrdersComponent implements OnInit, OnDestroy {
  private readonly ordersService = inject(OrdersService);
  private quoteCountdownTimer: ReturnType<typeof setInterval> | null = null;

  readonly orders = signal<OrderResponse[]>([]);
  readonly meta = signal<PageMetaData | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly currentPage = signal(0);
  readonly now = signal(Date.now());

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
    this.loading.set(true);
    this.error.set(false);
    this.ordersService.getMyOrders(this.currentPage()).subscribe({
      next: (res) => {
        this.orders.set(res.content);
        this.meta.set(res.page);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.load();
  }

  statusConfig(status: string): { label: string; classes: string } {
    return STATUS_CONFIG[status] ?? { label: status, classes: 'bg-gray-100 text-gray-600' };
  }

  canRenderPayNow(order: OrderResponse): boolean {
    const allowedStatuses = new Set(['INITIATED', 'QUOTE_READY_PAYMENT_PENDING']);
    return (
      Boolean(order.payableNow) &&
      allowedStatuses.has(order.status) &&
      Boolean(this.resolvePaymentUrl(order))
    );
  }

  resolvePaymentUrl(order: OrderResponse): string | null {
    if (order.checkoutUrl) return order.checkoutUrl;
    if (order.initPoint) return order.initPoint;
    if (order.preferenceId) {
      return `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${encodeURIComponent(order.preferenceId)}`;
    }
    return null;
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

  payNow(order: OrderResponse): void {
    const url = this.resolvePaymentUrl(order);
    if (!url) return;
    window.location.href = url;
  }
}
