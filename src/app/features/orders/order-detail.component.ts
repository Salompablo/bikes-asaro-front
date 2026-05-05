import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderResponse } from '../admin/models/admin.models';
import { OrdersService } from './services/orders.service';

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
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
    <div class="min-h-screen bg-brand-light pt-28 pb-16 px-4">
      <div class="max-w-6xl mx-auto">
        <a
          routerLink="/orders"
          class="inline-flex items-center gap-2 text-sm text-brand-gray hover:text-brand-black transition-colors"
        >
          <span aria-hidden="true">←</span>
          Volver a mis pedidos
        </a>

        @if (loading()) {
          <div class="flex items-center justify-center py-24">
            <div
              class="w-10 h-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"
            ></div>
          </div>
        } @else if (error()) {
          <div class="mt-6 rounded-lg border border-red-200 bg-red-50 px-6 py-8 text-center">
            <p class="text-red-700 mb-4">No pudimos cargar este pedido.</p>
            <button
              type="button"
              (click)="load()"
              class="px-5 py-2 bg-brand-black text-brand-white font-display uppercase tracking-widest text-sm rounded-lg hover:bg-brand-dark transition-colors"
            >
              Reintentar
            </button>
          </div>
        } @else if (order()) {
          <div class="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
            <section class="xl:col-span-2 space-y-6">
              <div class="rounded-2xl border border-gray-200 bg-brand-white p-6 shadow-sm">
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <p class="text-xs text-brand-gray font-display uppercase tracking-widest">
                      Pedido
                    </p>
                    <h1 class="font-display uppercase tracking-widest text-2xl mt-1">
                      #{{ order()!.id }}
                    </h1>
                    <p class="text-sm text-brand-gray mt-2">
                      Realizado el {{ order()!.createdAt | date: 'dd/MM/yyyy HH:mm' }}
                    </p>
                  </div>
                  <span
                    class="inline-flex self-start items-center px-3 py-1 rounded-full text-xs font-semibold"
                    [ngClass]="statusConfig(order()!.status).classes"
                  >
                    {{ statusConfig(order()!.status).label }}
                  </span>
                </div>

                @if (order()!.status === 'CANCELLED') {
                  <div
                    class="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    Este pedido fue cancelado.
                  </div>
                } @else {
                  <div class="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                    @for (step of orderSteps(); track step; let i = $index) {
                      <div
                        class="rounded-xl border px-3 py-3 text-center text-xs font-display uppercase tracking-wider"
                        [ngClass]="
                          i <= currentStepIndex()
                            ? 'border-brand-black bg-brand-black text-brand-white'
                            : 'border-gray-200 bg-gray-50 text-gray-500'
                        "
                      >
                        {{ step }}
                      </div>
                    }
                  </div>
                }
              </div>

              <div class="rounded-2xl border border-gray-200 bg-brand-white p-6 shadow-sm">
                <h2 class="font-display uppercase tracking-widest text-sm mb-4">Productos</h2>
                <div class="space-y-4">
                  @for (item of order()!.items; track item.productId) {
                    <div
                      class="flex flex-col sm:flex-row sm:items-center gap-4 pb-4 border-b border-gray-100 last:border-b-0 last:pb-0"
                    >
                      <a
                        [routerLink]="['/products', item.productId]"
                        class="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden shrink-0"
                        aria-label="Ver producto"
                      >
                        @if (item.imageUrl) {
                          <img
                            [src]="item.imageUrl"
                            [alt]="item.productName"
                            class="w-full h-full object-cover"
                            loading="lazy"
                            (error)="onImageError($event)"
                          />
                        } @else {
                          <div
                            class="w-full h-full flex items-center justify-center text-xs text-gray-500 text-center px-2"
                          >
                            Sin imagen
                          </div>
                        }
                      </a>

                      <div class="flex-1 min-w-0">
                        <a
                          [routerLink]="['/products', item.productId]"
                          class="font-medium text-brand-black hover:underline"
                        >
                          {{ item.productName }}
                        </a>
                        <p class="text-sm text-brand-gray mt-1">Cantidad: {{ item.quantity }}</p>
                        <p class="text-sm text-brand-gray">
                          {{ item.unitPrice | currency: 'ARS' : '$' : '1.0-0' }} c/u
                        </p>
                      </div>

                      <div class="text-right">
                        <p class="text-xs text-brand-gray uppercase tracking-widest font-display">
                          Subtotal
                        </p>
                        <p class="font-semibold">
                          {{ item.unitPrice * item.quantity | currency: 'ARS' : '$' : '1.0-0' }}
                        </p>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </section>

            <aside class="space-y-6">
              <div class="rounded-2xl border border-gray-200 bg-brand-white p-6 shadow-sm">
                <h2 class="font-display uppercase tracking-widest text-sm mb-4">Resumen</h2>
                <div class="space-y-3 text-sm">
                  <div class="flex items-center justify-between">
                    <span class="text-brand-gray">Subtotal productos</span>
                    <span>{{ itemsSubtotal() | currency: 'ARS' : '$' : '1.0-0' }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-brand-gray">Envio</span>
                    <span>{{ order()!.shippingCost | currency: 'ARS' : '$' : '1.0-0' }}</span>
                  </div>
                  <div class="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span class="font-display uppercase tracking-widest text-xs">Total</span>
                    <span class="font-semibold text-lg">{{
                      order()!.totalAmount | currency: 'ARS' : '$' : '1.0-0'
                    }}</span>
                  </div>
                </div>
              </div>

              <div class="rounded-2xl border border-gray-200 bg-brand-white p-6 shadow-sm">
                <h2 class="font-display uppercase tracking-widest text-sm mb-4">Entrega</h2>
                <dl class="space-y-3 text-sm">
                  <div class="flex items-center justify-between gap-4">
                    <dt class="text-brand-gray">Metodo</dt>
                    <dd class="text-right">{{ deliveryMethodLabel(order()!.deliveryMethod) }}</dd>
                  </div>

                  @if (order()!.deliveryMethod === 'SHIPPING') {
                    <div class="flex items-start justify-between gap-4">
                      <dt class="text-brand-gray">Direccion</dt>
                      <dd class="text-right">{{ order()!.shippingAddress || '-' }}</dd>
                    </div>
                    <div class="flex items-center justify-between gap-4">
                      <dt class="text-brand-gray">Codigo postal</dt>
                      <dd class="text-right">{{ order()!.zipCode || '-' }}</dd>
                    </div>
                  }

                  <div class="flex items-center justify-between gap-4">
                    <dt class="text-brand-gray">Tracking</dt>
                    <dd class="text-right">{{ order()!.trackingNumber || '-' }}</dd>
                  </div>
                </dl>
              </div>
            </aside>
          </div>
        }
      </div>
    </div>
  `,
})
export class OrderDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ordersService = inject(OrdersService);

  readonly order = signal<OrderResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly itemsSubtotal = computed(() => {
    const currentOrder = this.order();
    if (!currentOrder) return 0;

    return currentOrder.items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  });

  readonly currentStepIndex = computed(() => {
    const currentOrder = this.order();
    if (!currentOrder) return 0;

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
      return ['Confirmado', 'Pago', 'Enviado', 'Entregado'];
    }

    return ['Confirmado', 'Pago', 'Listo para retirar', 'Retirado'];
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const orderId = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isFinite(orderId) || orderId <= 0) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(false);

    this.ordersService.getOrderById(orderId).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  statusConfig(status: string): { label: string; classes: string } {
    return STATUS_CONFIG[status] ?? { label: status, classes: 'bg-gray-100 text-gray-600' };
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
}
