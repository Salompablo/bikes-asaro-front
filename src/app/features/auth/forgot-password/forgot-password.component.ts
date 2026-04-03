import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ErrorResponse } from '../models/auth.models';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly step = signal<1 | 2>(1);
  readonly showPassword = signal(false);

  readonly emailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly resetForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    newPassword: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(15)]],
  });

  onSendCode(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.authService.forgotPassword(this.emailForm.getRawValue()).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.toast.success(res.message || 'Código enviado a tu correo.');
        this.step.set(2);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const body = err.error as ErrorResponse;
        this.toast.error(body?.message ?? 'No pudimos enviar el código. Intentá de nuevo.');
      },
    });
  }

  onResetPassword(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { code, newPassword } = this.resetForm.getRawValue();
    this.authService.resetPassword({
      email: this.emailForm.getRawValue().email,
      code,
      newPassword,
    }).subscribe({
      next: (res) => {
        this.toast.success(res.message || 'Contraseña restablecida correctamente.');
        this.router.navigate(['/auth/login']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const body = err.error as ErrorResponse;
        this.toast.error(body?.message ?? 'Error al restablecer. Verificá el código e intentá de nuevo.');
      },
    });
  }
}
