import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-checkout-failure',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page page--narrow min-h-[calc(100vh-var(--header-h))]">
      <div class="result-head">
        <span class="result-mark result-mark--error" aria-hidden="true">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
        <div>
          <h1 class="page-title">El pago no se pudo completar</h1>
          <p class="page-lede">
            Mercado Pago rechazó el pago y no se te cobró nada. Podés intentar de nuevo con otro medio de
            pago; tus productos siguen en el carrito.
          </p>
          <div class="mt-8 flex flex-col gap-3 sm:flex-row">
            <a routerLink="/checkout" class="btn btn--primary btn--lg">Intentar de nuevo</a>
            <a routerLink="/contacto" class="btn btn--outline btn--lg">Necesito ayuda</a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class CheckoutFailureComponent {}
