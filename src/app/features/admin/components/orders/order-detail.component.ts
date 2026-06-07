import { CurrencyPipe, NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastService } from '../../../../shared/services/toast.service';
import { AdminOrderDetailResponse, OrderStatus } from '../../models/admin.models';
import { AdminService } from '../../services/admin.service';

const STATUS_CLASSES: Record<string, string> = {
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

@Component({
  selector: 'app-admin-order-detail',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, NgClass, FormsModule],
  templateUrl: './order-detail.component.html',
})
export class AdminOrderDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly submittingQuote = signal(false);
  readonly notFound = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly quoteError = signal<string | null>(null);
  readonly statusActionError = signal<string | null>(null);
  readonly order = signal<AdminOrderDetailResponse | null>(null);
  readonly shippingCostInput = signal<string | number | null>('');
  readonly confirmStatusModalVisible = signal(false);
  readonly submittingStatusAction = signal(false);

  readonly canPublishQuote = computed(() => {
    const currentOrder = this.order();
    if (!currentOrder || this.submittingQuote()) return false;
    if (!currentOrder.requiresShippingQuote) return false;

    const parsed = this.parseShippingCostInput(this.shippingCostInput());
    return Number.isFinite(parsed) && parsed > 0;
  });

  readonly nextAdminAction = computed<{
    targetStatus: OrderStatus;
    buttonLabel: string;
    title: string;
    message: string;
    successToast: string;
  } | null>(() => {
    const currentOrder = this.order();
    if (!currentOrder) return null;
    if (this.submittingStatusAction()) return null;

    const currentStatus = (currentOrder.status ?? '').toUpperCase();
    const deliveryMethod = (currentOrder.deliveryMethod ?? '').toUpperCase();

    if (deliveryMethod === 'STORE_PICKUP') {
      if (currentStatus === 'PAID') {
        return {
          targetStatus: 'READY_FOR_PICKUP',
          buttonLabel: 'Marcar como listo para retiro',
          title: 'Confirmar pedido listo para retiro',
          message:
            "Al confirmar, el pedido pasará a 'Listo para retiro' y se enviará un email al cliente.",
          successToast: 'Pedido marcado como Listo para retiro. Email enviado al cliente.',
        };
      }

      if (currentStatus === 'READY_FOR_PICKUP') {
        return {
          targetStatus: 'PICKED_UP',
          buttonLabel: 'Marcar como recogido',
          title: 'Confirmar pedido recogido',
          message:
            "Al confirmar, el pedido pasará a 'Recogido'. Este será el estado final del pedido para retiro en local.",
          successToast: 'Pedido marcado como Recogido.',
        };
      }

      return null;
    }

    if (deliveryMethod === 'SHIPPING') {
      if (currentStatus === 'PAID') {
        return {
          targetStatus: 'SHIPPED',
          buttonLabel: 'Marcar como enviado',
          title: 'Confirmar pedido enviado',
          message: "Al confirmar, el pedido pasará a 'Enviado' y se enviará un email al cliente.",
          successToast: 'Pedido marcado como Enviado. Email enviado al cliente.',
        };
      }

      if (currentStatus === 'SHIPPED') {
        return {
          targetStatus: 'DELIVERED',
          buttonLabel: 'Marcar como recibido',
          title: 'Confirmar pedido recibido',
          message:
            "Al confirmar, el pedido pasará a 'Recibido'. Este será el estado final del pedido para envío a domicilio.",
          successToast: 'Pedido marcado como Recibido.',
        };
      }

      return null;
    }

    return null;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const orderId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(orderId) || orderId <= 0) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.notFound.set(false);
    this.errorMessage.set(null);

    this.adminService.getOrderById(orderId).subscribe({
      next: (order) => {
        this.order.set(order);
        this.shippingCostInput.set(order.shippingCost != null ? String(order.shippingCost) : '');
        this.statusActionError.set(null);
        this.confirmStatusModalVisible.set(false);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.notFound.set(true);
          return;
        }

        this.errorMessage.set('No pudimos cargar el detalle de la orden.');
      },
    });
  }

  onShippingCostInput(value: string | number | null): void {
    this.shippingCostInput.set(value);
    this.quoteError.set(null);
  }

  publishQuote(): void {
    const currentOrder = this.order();
    if (!currentOrder) return;

    const parsed = this.parseShippingCostInput(this.shippingCostInput());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      this.quoteError.set('Ingresá un costo de envío válido mayor a 0.');
      return;
    }

    this.submittingQuote.set(true);
    this.quoteError.set(null);

    this.adminService.publishShippingQuote(currentOrder.id, parsed).subscribe({
      next: (checkout) => {
        this.toast.success('Cotización publicada. El cliente fue notificado por correo.');

        this.order.update((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            shippingCost: parsed,
            requiresShippingQuote: checkout.requiresShippingQuote,
            payableNow: checkout.payableNow,
            status: checkout.flowStatus || prev.status,
            initPoint: checkout.initPoint,
            preferenceId: checkout.preferenceId,
          };
        });

        this.submittingQuote.set(false);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.submittingQuote.set(false);
        this.quoteError.set(this.mapQuoteError(err));
      },
    });
  }

  openStatusActionConfirm(): void {
    if (!this.nextAdminAction()) return;
    this.statusActionError.set(null);
    this.confirmStatusModalVisible.set(true);
  }

  closeStatusActionConfirm(): void {
    if (this.submittingStatusAction()) return;
    this.confirmStatusModalVisible.set(false);
  }

  applyNextStatusAction(): void {
    const currentOrder = this.order();
    const action = this.nextAdminAction();
    if (!currentOrder || !action) return;

    this.submittingStatusAction.set(true);
    this.statusActionError.set(null);

    this.adminService.updateOrderStatus(currentOrder.id, action.targetStatus).subscribe({
      next: (updatedOrder) => {
        this.order.update((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            ...updatedOrder,
          };
        });
        this.confirmStatusModalVisible.set(false);
        this.submittingStatusAction.set(false);
        this.toast.success(action.successToast);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.submittingStatusAction.set(false);
        if (err.status === 409 && typeof err.error?.message === 'string') {
          this.statusActionError.set(err.error.message);
          return;
        }
        this.statusActionError.set(
          'No pudimos actualizar el estado de la orden. Intentá nuevamente.',
        );
      },
    });
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
      PAID: 'Pagada',
      REFUNDED: 'Reembolsado',
      CHARGED_BACK: 'Contracargado',
      READY_FOR_PICKUP: 'Lista para retirar',
      PICKED_UP: 'Recogido',
      SHIPPED: 'Enviada',
      DELIVERED: 'Recibido',
      CANCELLED: 'Cancelada',
    };
    return labels[normalizedStatus] ?? status;
  }

  statusClass(status: string): string {
    return STATUS_CLASSES[status] ?? 'bg-gray-100 text-gray-700';
  }

  deliveryMethodLabel(method: string): string {
    if (method === 'SHIPPING') return 'Envio a domicilio';
    if (method === 'STORE_PICKUP') return 'Retiro en tienda';
    return method;
  }

  private mapQuoteError(err: HttpErrorResponse): string {
    if (err.status === 400) return 'Datos inválidos. Revisá el costo de envío e intentá de nuevo.';
    if (err.status === 404) return 'La orden no existe o no está disponible para cotizar.';
    if (err.status === 409) {
      const backendMessage =
        typeof err.error?.message === 'string'
          ? err.error.message
          : 'La orden cambió de estado y no puede cotizarse en este momento.';
      return backendMessage;
    }
    if (err.status >= 500)
      return 'Error del servidor al publicar la cotización. Intentá nuevamente.';
    return 'No pudimos publicar la cotización.';
  }

  private parseShippingCostInput(value: string | number | null): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value.replace(',', '.'));
    return Number.NaN;
  }
}
