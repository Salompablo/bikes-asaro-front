import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ErrorResponse } from '../models/auth.models';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './verify-email.component.html',
})
export class VerifyEmailComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly resendLoading = signal(false);

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    email: ['' as string, []],
  });

  constructor() {
    const pendingEmail = this.authService.getPendingVerificationEmail();
    if (pendingEmail) {
      this.form.patchValue({ email: pendingEmail });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.authService.verifyEmail(this.form.getRawValue().code).subscribe({
      next: () => {
        this.authService.clearPendingVerificationEmail();
        this.toast.success('Correo verificado correctamente');
        this.router.navigate(['/']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const body = err.error as ErrorResponse;

        if (!err.status || err.status === 0) {
          this.toast.error('No pudimos conectar con el servidor. Verificá tu conexión a internet.');
          return;
        }

        if (err.status === 400) {
          this.toast.error('Código inválido o expirado. Intentá de nuevo.');
        } else if (err.status === 500 || err.status === 502 || err.status === 503) {
          this.toast.error(
            'El servidor está en mantenimiento. Intentá nuevamente en unos minutos.',
          );
        } else {
          this.toast.error(body?.message ?? 'Código inválido o expirado. Intentá de nuevo.');
        }
      },
    });
  }

  resendCode(): void {
    const email = this.form.get('email')?.value || this.authService.getPendingVerificationEmail();
    if (!email) {
      this.toast.error('No encontramos el correo para reenvíar el código.');
      return;
    }

    this.resendLoading.set(true);
    this.authService.resendVerification({ email }).subscribe({
      next: () => {
        this.resendLoading.set(false);
        this.toast.success('Se reenvió el código a tu correo.');
      },
      error: (err: HttpErrorResponse) => {
        this.resendLoading.set(false);
        const body = err.error as ErrorResponse;
        if (!err.status || err.status === 0) {
          this.toast.error('No pudimos conectar con el servidor. Verificá tu conexión a internet.');
          return;
        }
        this.toast.error(body?.message ?? 'No se pudo reenviar el código.');
      },
    });
  }
}
