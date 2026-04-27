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

    this.loading.set(true);
    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.toast.success('Sesión iniciada correctamente');
        this.router.navigateByUrl(this.redirectUrl);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.handleError(err);
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

  private handleError(err: HttpErrorResponse): void {
    const body = err.error as ErrorResponse;
    const msg = body?.message ?? 'Error inesperado. Intentá de nuevo.';

    if (err.status === 401) {
      this.toast.error('Credenciales incorrectas. Verificá tu email y contraseña.');
    } else if (err.status === 403) {
      this.toast.error(msg);
    } else {
      this.toast.error(msg);
    }
  }
}
