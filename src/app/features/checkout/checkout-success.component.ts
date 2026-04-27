import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartStateService } from '../../core/services/cart-state.service';
import { CheckoutService } from './services/checkout.service';

@Component({
  selector: 'app-checkout-success',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="min-h-screen bg-brand-light flex items-center justify-center px-4 py-10">
      <div class="w-full max-w-lg rounded-2xl bg-brand-white border border-gray-200 shadow-xl p-6 sm:p-8">
        <div class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 class="text-3xl text-center mb-3">Pago confirmado</h1>
        <p class="text-brand-gray text-center mb-4">
          Tu compra se registro correctamente y ya estamos preparando tu pedido.
        </p>

        <div class="rounded-lg border border-green-200 bg-green-50 px-4 py-3 mb-8">
          <p class="text-sm text-green-800 text-center">
            Te avisaremos cuando tu pedido este listo para retirar.
          </p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3">
          <a
            routerLink="/catalog"
            class="flex-1 inline-flex items-center justify-center px-6 py-3 bg-brand-black text-brand-white font-display uppercase tracking-widest text-sm rounded-lg hover:bg-brand-dark transition-colors"
          >
            Seguir comprando
          </a>
          <a
            routerLink="/orders"
            class="flex-1 inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-brand-black font-display uppercase tracking-widest text-sm rounded-lg hover:bg-gray-50 transition-colors"
          >
            Ver mis pedidos
          </a>
        </div>
      </div>
    </section>
  `,
})
export class CheckoutSuccessComponent implements OnInit {
  private readonly cartService = inject(CartStateService);
  private readonly checkoutService = inject(CheckoutService);

  ngOnInit(): void {
    this.cartService.clearCart();
    this.checkoutService.clearPendingOrderId();
  }
}
