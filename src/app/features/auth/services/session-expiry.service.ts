import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../../../shared/services/toast.service';
import { CartStateService } from '../../../core/services/cart-state.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SessionExpiryService {
  private readonly authService = inject(AuthService);
  private readonly cartState = inject(CartStateService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly platformId = inject(PLATFORM_ID);

  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly isHandlingExpiry = signal(false);
  private readonly loginReturnUrl = signal<string | null>(null);

  readonly modalVisible = signal(false);
  readonly modalTitle = signal('Tu sesión expiró');
  readonly modalMessage = signal('Volvé a iniciar sesión para seguir con tu cuenta.');

  constructor() {
    effect(() => {
      const token = this.authService.token();

      this.clearExpirationTimer();

      if (!isPlatformBrowser(this.platformId) || !token) {
        return;
      }

      const expiresAt = this.authService.tokenExpiresAt();
      if (!expiresAt) {
        return;
      }

      const delay = expiresAt - Date.now();

      if (delay <= 0) {
        queueMicrotask(() => this.handleExpiredSession('expired'));
        return;
      }

      this.timeoutId = setTimeout(() => this.handleExpiredSession('expired'), delay);
    });
  }

  handleUnauthorizedResponse(): void {
    if (!this.authService.getToken()) {
      return;
    }

    this.handleExpiredSession('unauthorized');
  }

  goToLogin(): void {
    const returnUrl = this.loginReturnUrl() ?? '/';
    this.closeModal();
    void this.router.navigate(['/auth/login'], { queryParams: { returnUrl } });
  }

  dismissModal(): void {
    this.closeModal();
  }

  private handleExpiredSession(reason: 'expired' | 'unauthorized'): void {
    if (!isPlatformBrowser(this.platformId) || this.isHandlingExpiry()) {
      return;
    }

    this.isHandlingExpiry.set(true);

    const currentUrl = this.sanitizedCurrentUrl();
    this.authService.logout();
    this.cartState.clearCart();

    if (this.requiresLoginRedirect(currentUrl)) {
      const message = currentUrl.startsWith('/checkout')
        ? 'Tu sesión expiró. Iniciá sesión nuevamente para continuar con tu compra.'
        : 'Tu sesión expiró. Iniciá sesión nuevamente para continuar.';

      this.toast.info(message);
      this.isHandlingExpiry.set(false);
      void this.router.navigate(['/auth/login'], { queryParams: { returnUrl: currentUrl } });
      return;
    }

    this.loginReturnUrl.set(currentUrl);
    this.modalMessage.set(
      reason === 'unauthorized'
        ? 'Volvé a iniciar sesión para seguir usando tu cuenta.'
        : 'Volvé a iniciar sesión para seguir con tu cuenta.',
    );
    this.modalVisible.set(true);
  }

  private sanitizedCurrentUrl(): string {
    const currentUrl = this.router.url || '/';
    return currentUrl.startsWith('/') ? currentUrl : '/';
  }

  private requiresLoginRedirect(url: string): boolean {
    return ['/orders', '/admin', '/checkout'].some((prefix) => url.startsWith(prefix));
  }

  private closeModal(): void {
    this.modalVisible.set(false);
    this.loginReturnUrl.set(null);
    this.isHandlingExpiry.set(false);
  }

  private clearExpirationTimer(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
