import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="min-h-screen bg-brand-light pt-28 pb-16 px-4">
      <div class="max-w-2xl mx-auto">
        <div class="rounded-2xl border border-gray-200 bg-brand-white p-6 sm:p-8 shadow-sm">
          <div class="flex items-start justify-between gap-4 mb-6">
            <div>
              <p class="text-xs text-brand-gray font-display uppercase tracking-widest">Perfil</p>
              <h1 class="text-2xl font-display uppercase tracking-widest mt-1">Mi cuenta</h1>
            </div>
            <a
              routerLink="/orders"
              class="text-sm text-brand-gray hover:text-brand-black transition-colors"
            >
              Ver pedidos
            </a>
          </div>

          @if (loading()) {
            <div class="flex items-center justify-center py-16">
              <div
                class="w-10 h-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"
              ></div>
            </div>
          } @else if (error()) {
            <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              No pudimos cargar tu perfil. Intenta nuevamente.
            </div>
          } @else if (authService.currentUser(); as user) {
            <dl class="space-y-4 text-sm">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                <dt class="text-brand-gray">Nombre</dt>
                <dd class="sm:col-span-2 text-brand-black">
                  {{ user.firstName }} {{ user.lastName }}
                </dd>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                <dt class="text-brand-gray">Email</dt>
                <dd class="sm:col-span-2 text-brand-black">{{ user.email }}</dd>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                <dt class="text-brand-gray">Proveedor</dt>
                <dd class="sm:col-span-2 text-brand-black">{{ user.provider }}</dd>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                <dt class="text-brand-gray">Email verificado</dt>
                <dd class="sm:col-span-2">
                  <span
                    class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                    [class.bg-emerald-100]="user.isEmailVerified"
                    [class.text-emerald-800]="user.isEmailVerified"
                    [class.bg-amber-100]="!user.isEmailVerified"
                    [class.text-amber-800]="!user.isEmailVerified"
                  >
                    {{ user.isEmailVerified ? 'Verificado' : 'Pendiente' }}
                  </span>
                </dd>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                <dt class="text-brand-gray">Telefono por defecto</dt>
                <dd class="sm:col-span-2 text-brand-black">
                  {{ user.defaultPhone || 'Sin telefono guardado' }}
                </dd>
              </div>
            </dl>
          }
        </div>
      </div>
    </section>
  `,
})
export class ProfileComponent implements OnInit {
  readonly authService = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal(false);

  ngOnInit(): void {
    this.authService.loadCurrentUserProfile().subscribe({
      next: () => {
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
