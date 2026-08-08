import { Component, afterNextRender, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ErrorResponse } from '../models/auth.models';
import { environment } from '../../../../environments/environment';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly googleReady = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  constructor() {
    afterNextRender(() => this.initGoogleSignIn());
  }

  private get redirectUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (!returnUrl || !returnUrl.startsWith('/')) {
      return '/';
    }
    return returnUrl;
  }

  get returnUrlQueryParams(): { returnUrl: string } | undefined {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (!returnUrl || !returnUrl.startsWith('/')) {
      return undefined;
    }
    return { returnUrl };
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();
    this.loading.set(true);
    this.authService.login(payload).subscribe({
      next: () => {
        this.authService.clearPendingVerificationEmail();
        this.toast.success('Sesión iniciada correctamente');
        this.router.navigateByUrl(this.redirectUrl);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.handleError(err, payload.email);
      },
    });
  }

  private initGoogleSignIn(): void {
    const clientId = environment.googleClientId;
    if (!clientId) return;

    const tryInit = (attempts = 0) => {
      if (typeof google === 'undefined' || !google.accounts) {
        if (attempts < 10) setTimeout(() => tryInit(attempts + 1), 300);
        return;
      }

      google.accounts.id.initialize({
        client_id: clientId,
        callback: (res: { credential: string }) => this.onGoogleCredential(res.credential),
      });

      const container = document.getElementById('google-btn');
      if (container) {
        google.accounts.id.renderButton(container, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          width: container.offsetWidth,
          text: 'signin_with',
          locale: 'es',
        });
        this.googleReady.set(true);
      }
    };

    tryInit();
  }

  private onGoogleCredential(credential: string): void {
    this.loading.set(true);
    this.authService.googleLogin({ token: credential }).subscribe({
      next: () => {
        this.toast.success('Sesión iniciada con Google');
        this.router.navigateByUrl(this.redirectUrl);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.handleError(err);
      },
    });
  }

  private handleError(err: HttpErrorResponse, email?: string): void {
    const body = err.error as ErrorResponse & { errorCode?: string };
    const msg = body?.message ?? 'Error inesperado. Intentá de nuevo.';
    const rawErrorText = this.extractErrorText(err).toLowerCase();
    const isPendingVerification =
      err.status === 409 &&
      (body?.errorCode === 'EMAIL_NOT_VERIFIED' || rawErrorText.includes('verify your email'));
    const hasBadCredentials =
      rawErrorText.includes('bad credentials') ||
      rawErrorText.includes('credenciales invalidas') ||
      rawErrorText.includes('credenciales inválidas');
    const isLoginRequest = (err.url ?? '').includes('/auth/login');
    const hasServiceUnavailableHint =
      rawErrorText.includes('mantenimiento') ||
      rawErrorText.includes('maintenance') ||
      rawErrorText.includes('service unavailable') ||
      rawErrorText.includes('temporarily unavailable');

    // Network error or connection failure (status 0 = failed to fetch or offline)
    if (!err.status || err.status === 0) {
      this.toast.error('No pudimos conectar con el servidor. Verificá tu conexión a internet.');
      return;
    }

    if (isPendingVerification) {
      if (email) {
        this.authService.savePendingVerificationEmail(email);
      }
      this.toast.info('Tu cuenta aún no fue verificada. Completá el proceso para continuar.');
      void this.router.navigate(['/auth/verify-email']);
    } else if (hasBadCredentials) {
      this.toast.error('Credenciales incorrectas. Verificá tu email y contraseña.');
    } else if (err.status === 401) {
      this.toast.error('Credenciales incorrectas. Verificá tu email y contraseña.');
    } else if (err.status === 404 || err.status === 400) {
      this.toast.error('Email o contraseña incorrectos. Revisá los datos e intentá de nuevo.');
    } else if (err.status === 403) {
      this.toast.error(msg);
    } else if (err.status === 500 || err.status === 502 || err.status === 503) {
      if (isLoginRequest && !hasServiceUnavailableHint) {
        this.toast.error('Credenciales incorrectas. Verificá tu email y contraseña.');
      } else {
        this.toast.error('El servidor está en mantenimiento. Intentá nuevamente en unos minutos.');
      }
    } else {
      this.toast.error(msg);
    }
  }

  private extractErrorText(err: HttpErrorResponse): string {
    if (typeof err.error === 'string') {
      return err.error;
    }

    if (typeof err.error?.message === 'string') {
      return err.error.message;
    }

    if (typeof err.error?.error === 'string') {
      return err.error.error;
    }

    return err.message ?? '';
  }
}
