import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-checkout-failure',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <div class="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
        <svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
      <h1 class="text-3xl mb-3">Hubo un problema con tu pago</h1>
      <p class="text-brand-gray mb-8 max-w-md">
        El pago no pudo completarse. Podés intentarlo de nuevo o volver al catálogo.
      </p>
      <div class="flex flex-col sm:flex-row items-center gap-4">
        <a
          routerLink="/checkout"
          class="inline-block px-6 py-3 bg-brand-black text-brand-white font-display uppercase tracking-widest text-sm rounded-lg hover:bg-brand-dark transition-colors"
        >
          Reintentar pago
        </a>
        <a
          routerLink="/catalog"
          class="inline-block px-6 py-3 border border-gray-300 text-brand-black font-display uppercase tracking-widest text-sm rounded-lg hover:bg-gray-50 transition-colors"
        >
          Volver al catálogo
        </a>
      </div>
    </section>
  `,
})
export class CheckoutFailureComponent {}
