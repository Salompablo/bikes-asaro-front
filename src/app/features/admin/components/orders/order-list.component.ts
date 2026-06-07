import { Component, inject, signal, OnInit } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { OrderResponse } from '../../models/admin.models';
import { ToastService } from '../../../../shared/services/toast.service';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './order-list.component.html',
})
export class OrderListComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  orders = signal<OrderResponse[]>([]);
  loading = signal(true);
  currentPage = signal(0);
  totalPages = signal(0);

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

  statusLabel(status: string): string {
    const normalizedStatus = (status ?? '').toUpperCase();
    const map: Record<string, string> = {
      INITIATED: 'Iniciada',
      QUOTE_REQUESTED: 'Cotización solicitada',
      QUOTE_READY_PAYMENT_PENDING: 'Cotización publicada',
      PENDING: 'Pendiente',
      PAID: 'Pagado',
      READY_FOR_PICKUP: 'Listo para retirar',
      PICKED_UP: 'Recogido',
      SHIPPED: 'Enviado',
      DELIVERED: 'Recibido',
      CANCELLED: 'Cancelado',
    };
    return map[normalizedStatus] ?? status;
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      INITIATED: 'bg-slate-100 text-slate-700',
      QUOTE_REQUESTED: 'bg-orange-100 text-orange-700',
      QUOTE_READY_PAYMENT_PENDING: 'bg-cyan-100 text-cyan-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
      PAID: 'bg-blue-100 text-blue-700',
      READY_FOR_PICKUP: 'bg-emerald-100 text-emerald-700',
      PICKED_UP: 'bg-green-100 text-green-700',
      SHIPPED: 'bg-purple-100 text-purple-700',
      DELIVERED: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-gray-100 text-gray-700';
  }

  deliveryMethodLabel(method: string): string {
    const map: Record<string, string> = {
      STORE_PICKUP: 'Retiro en tienda',
      SHIPPING: 'Envío a domicilio',
    };
    return map[method] ?? method;
  }
}
