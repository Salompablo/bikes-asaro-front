import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartStateService } from '../../core/services/cart-state.service';

@Component({
  selector: 'app-checkout-success',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <div class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
        <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h1 class="text-3xl mb-3">¡Pago procesado con éxito!</h1>
      <p class="text-brand-gray mb-8 max-w-md">
        Tu pedido fue confirmado. Recibirás un correo con los detalles de tu compra.
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
export class CheckoutSuccessComponent implements OnInit {
  private readonly cartService = inject(CartStateService);

  ngOnInit(): void {
    this.cartService.clearCart();
  }
}
