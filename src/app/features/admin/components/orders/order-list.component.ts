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
  templateUrl: './order-list.component.html',
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
