import { Component, inject, signal, OnInit } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { OrderResponse, OrderStatus } from '../../models/admin.models';
import { ToastService } from '../../../../shared/services/toast.service';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe],
  template: `
    <div class="space-y-6">
      <h2 class="text-2xl font-display tracking-tight text-brand-black">Pedidos</h2>

      @if (loading()) {
        <div class="text-center py-12 text-brand-gray">Cargando pedidos...</div>
      } @else {
        <div class="bg-brand-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-200">
                  <th class="text-left px-4 py-3 font-display uppercase tracking-wider text-xs text-brand-gray">ID</th>
                  <th class="text-left px-4 py-3 font-display uppercase tracking-wider text-xs text-brand-gray">Fecha</th>
                  <th class="text-right px-4 py-3 font-display uppercase tracking-wider text-xs text-brand-gray">Total</th>
                  <th class="text-left px-4 py-3 font-display uppercase tracking-wider text-xs text-brand-gray">Dirección</th>
                  <th class="text-center px-4 py-3 font-display uppercase tracking-wider text-xs text-brand-gray">Estado</th>
                  <th class="text-center px-4 py-3 font-display uppercase tracking-wider text-xs text-brand-gray">Acción</th>
                </tr>
              </thead>
              <tbody>
                @for (order of orders(); track order.id) {
                  <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td class="px-4 py-3 font-mono text-xs text-brand-gray">#{{ order.id }}</td>
                    <td class="px-4 py-3 text-brand-gray text-xs">{{ order.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td class="px-4 py-3 text-right tabular-nums">{{ order.totalAmount | currency:'ARS':'symbol':'1.0-0' }}</td>
                    <td class="px-4 py-3 text-brand-gray text-xs">{{ order.shippingAddress || 'Retiro en tienda' }}</td>
                    <td class="px-4 py-3 text-center">
                      <span class="inline-block px-2 py-0.5 rounded-full text-xs font-bold uppercase"
                            [class]="statusClass(order.status)">
                        {{ statusLabel(order.status) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <select [ngModel]="order.status" (ngModelChange)="updateStatus(order, $event)"
                              class="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-brand-black">
                        @for (s of statuses; track s) {
                          <option [value]="s">{{ statusLabel(s) }}</option>
                        }
                      </select>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="text-center py-8 text-brand-gray">No hay pedidos.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        @if (totalPages() > 1) {
          <div class="flex items-center justify-center gap-2 pt-4">
            <button (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() === 0"
                    class="px-3 py-1.5 rounded-lg text-sm border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition-colors">
              ← Anterior
            </button>
            <span class="text-sm text-brand-gray px-3">
              Página {{ currentPage() + 1 }} de {{ totalPages() }}
            </span>
            <button (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() + 1 >= totalPages()"
                    class="px-3 py-1.5 rounded-lg text-sm border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition-colors">
              Siguiente →
            </button>
          </div>
        }
      }
    </div>
  `,
})
export class OrderListComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  orders = signal<OrderResponse[]>([]);
  loading = signal(true);
  currentPage = signal(0);
  totalPages = signal(0);

  readonly statuses: OrderStatus[] = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.adminService.getOrders(this.currentPage()).subscribe({
      next: (res) => {
        this.orders.set(res.content);
        this.totalPages.set(res.page.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar pedidos');
        this.loading.set(false);
      },
    });
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadOrders();
  }

  updateStatus(order: OrderResponse, status: OrderStatus): void {
    this.adminService.updateOrderStatus(order.id, status).subscribe({
      next: (updated) => {
        this.orders.update((list) => list.map((o) => (o.id === updated.id ? updated : o)));
        this.toast.success(`Pedido #${order.id} actualizado a ${this.statusLabel(status)}`);
      },
      error: () => this.toast.error('Error al actualizar el estado'),
    });
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'Pendiente',
      PAID: 'Pagado',
      SHIPPED: 'Enviado',
      DELIVERED: 'Entregado',
      CANCELLED: 'Cancelado',
    };
    return map[status] ?? status;
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      PAID: 'bg-blue-100 text-blue-700',
      SHIPPED: 'bg-purple-100 text-purple-700',
      DELIVERED: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-gray-100 text-gray-700';
  }
}
