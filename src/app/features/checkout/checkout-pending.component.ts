import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CheckoutService } from './services/checkout.service';

@Component({
  selector: 'app-checkout-pending',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <div class="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mb-6">
        <svg
          class="w-10 h-10 text-yellow-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h1 class="text-3xl mb-3">Tu pago está pendiente</h1>
      <p class="text-brand-gray mb-8 max-w-md">
        Estamos esperando la confirmación de tu pago. Te notificaremos por correo cuando se
        acredite.
      </p>
      <a
        routerLink="/catalog"
        class="inline-block px-6 py-3 bg-brand-black text-brand-white font-display uppercase tracking-widest text-sm rounded-lg hover:bg-brand-dark transition-colors"
      >
        Volver al catálogo
      </a>
    </section>
  `,
})
export class CheckoutPendingComponent implements OnInit {
  private readonly checkoutService = inject(CheckoutService);

  ngOnInit(): void {
    this.releasePendingOrderReservation();
  }

  private releasePendingOrderReservation(): void {
    const orderId = this.checkoutService.getPendingOrderId();
    if (!orderId) return;

    this.checkoutService.cancelOrder(orderId).subscribe({
      next: () => this.checkoutService.clearPendingOrderId(),
      error: (error: HttpErrorResponse) => {
        if ([400, 404, 409].includes(error.status)) {
          this.checkoutService.clearPendingOrderId();
        }
      },
    });
  }
}
