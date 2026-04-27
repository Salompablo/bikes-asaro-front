import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrderResponse, PageMetaData } from '../admin/models/admin.models';
import { OrdersService } from './services/orders.service';

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  PENDING:          { label: 'Pendiente de confirmación', classes: 'bg-yellow-100 text-yellow-800' },
  PAID:             { label: 'Pago confirmado',           classes: 'bg-blue-100 text-blue-800' },
  READY_FOR_PICKUP: { label: 'Listo para retirar',        classes: 'bg-green-100 text-green-800' },
  PICKED_UP:        { label: 'Retirado',                  classes: 'bg-gray-100 text-gray-700' },
  CANCELLED:        { label: 'Cancelado',                 classes: 'bg-red-100 text-red-700' },
};

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, NgClass],
  template: `
    <div class="min-h-screen bg-brand-light pt-28 pb-16 px-4">
      <div class="max-w-3xl mx-auto">

        <h1 class="font-display uppercase tracking-widest text-2xl mb-8">Mis pedidos</h1>

        @if (loading()) {
          <div class="flex items-center justify-center py-24">
            <div class="w-10 h-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        } @else if (error()) {
          <div class="rounded-lg border border-red-200 bg-red-50 px-6 py-8 text-center">
            <p class="text-red-700 mb-4">No pudimos cargar tus pedidos. Intentá de nuevo.</p>
            <button
              type="button"
              (click)="load()"
              class="px-5 py-2 bg-brand-black text-brand-white font-display uppercase tracking-widest text-sm rounded-lg hover:bg-brand-dark transition-colors"
            >
              Reintentar
            </button>
          </div>
        } @else if (orders().length === 0) {
          <div class="rounded-2xl border border-gray-200 bg-brand-white p-12 text-center shadow-sm">
            <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-5">
              <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <p class="text-lg font-display uppercase tracking-widest mb-2">Sin pedidos aún</p>
            <p class="text-brand-gray text-sm mb-6">Cuando realices una compra, aparecerá acá.</p>
            <a
              routerLink="/catalog"
              class="inline-block px-6 py-3 bg-brand-black text-brand-white font-display uppercase tracking-widest text-sm rounded-lg hover:bg-brand-dark transition-colors"
            >
              Ver productos
            </a>
          </div>
        } @else {
          <div class="space-y-4">
            @for (order of orders(); track order.id) {
              <div class="rounded-2xl border border-gray-200 bg-brand-white shadow-sm overflow-hidden">

                <!-- Header del pedido -->
                <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div>
                    <span class="text-xs text-brand-gray font-display uppercase tracking-widest">Pedido #{{ order.id }}</span>
                    <p class="text-sm text-brand-gray mt-0.5">{{ order.createdAt | date: 'dd/MM/yyyy HH:mm' }}</p>
                  </div>
                  <span
                    class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
                    [ngClass]="statusConfig(order.status).classes"
                  >
                    {{ statusConfig(order.status).label }}
                  </span>
                </div>

                <!-- Ítems -->
                <div class="px-5 py-4 space-y-3">
                  @for (item of order.items; track item.productId) {
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <span class="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                          {{ item.quantity }}
                        </span>
                        <span class="text-sm">{{ item.productName }}</span>
                      </div>
                      <span class="text-sm text-brand-gray">
                        {{ item.unitPrice * item.quantity | currency: 'ARS' : '$' : '1.0-0' }}
                      </span>
                    </div>
                  }
                </div>

                <!-- Footer del pedido -->
                <div class="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100">
                  <span class="text-xs text-brand-gray uppercase tracking-widest font-display">Total</span>
                  <span class="font-semibold">
                    {{ order.totalAmount | currency: 'ARS' : '$' : '1.0-0' }}
                  </span>
                </div>

              </div>
            }
          </div>

          <!-- Paginación -->
          @if (meta() && meta()!.totalPages > 1) {
            <div class="flex items-center justify-center gap-3 mt-8">
              <button
                type="button"
                [disabled]="currentPage() === 0"
                (click)="goToPage(currentPage() - 1)"
                class="px-4 py-2 rounded-lg border border-gray-200 text-sm font-display uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              >
                Anterior
              </button>
              <span class="text-sm text-brand-gray">
                {{ currentPage() + 1 }} / {{ meta()!.totalPages }}
              </span>
              <button
                type="button"
                [disabled]="currentPage() >= meta()!.totalPages - 1"
                (click)="goToPage(currentPage() + 1)"
                class="px-4 py-2 rounded-lg border border-gray-200 text-sm font-display uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              >
                Siguiente
              </button>
            </div>
          }
        }

      </div>
    </div>
  `,
})
export class MyOrdersComponent implements OnInit {
  private readonly ordersService = inject(OrdersService);

  readonly orders = signal<OrderResponse[]>([]);
  readonly meta = signal<PageMetaData | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly currentPage = signal(0);

  ngOnInit(): void {
    this.load();
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
}
