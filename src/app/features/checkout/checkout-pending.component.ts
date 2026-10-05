import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-checkout-pending',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page page--narrow">
      <div class="result-head">
        <span class="result-mark result-mark--wait" aria-hidden="true">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
        <div>
          <h1 class="page-title">Tu pago está en proceso</h1>
          <p class="page-lede">
            Mercado Pago todavía no lo acreditó. Suele pasar con pagos en efectivo o transferencias; cuando
            se confirme, vas a ver el pedido actualizado en tu cuenta.
          </p>
          <div class="mt-8 flex flex-col gap-3 sm:flex-row">
            <a routerLink="/orders" class="btn btn--primary btn--lg">Ver mis pedidos</a>
            <a routerLink="/" class="btn btn--outline btn--lg">Volver al inicio</a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class CheckoutPendingComponent {}
