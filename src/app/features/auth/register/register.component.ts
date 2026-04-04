import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ErrorResponse } from '../models/auth.models';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')!.value;
  const confirm = group.get('confirmPassword')!.value;
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(15)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator },
  );

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { confirmPassword, ...data } = this.form.getRawValue();
    this.authService.register(data).subscribe({
      next: (res) => {
        this.toast.success(res.message || 'Cuenta creada. Revisá tu correo para verificarla.');
        this.router.navigate(['/auth/verify-email']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const body = err.error as ErrorResponse;
        const msg = body?.message ?? 'Error inesperado. Intentá de nuevo.';

        if (err.status === 409) {
          this.toast.error('Este correo ya está registrado. Intentá iniciar sesión.');
        } else {
          this.toast.error(msg);
        }
      },
    });
  }
}
