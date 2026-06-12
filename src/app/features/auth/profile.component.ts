import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ChangePasswordRequest,
  ErrorResponse,
  UpdateProfileRequest,
  UserProfile,
} from './models/auth.models';
import { AuthService } from './services/auth.service';
import { ToastService } from '../../shared/services/toast.service';

function trimmedRequiredValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  return typeof value === 'string' && value.trim().length > 0 ? null : { notBlank: true };
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly profileLoadError = signal<string | null>(null);
  readonly profileSubmitError = signal<string | null>(null);
  readonly passwordSubmitError = signal<string | null>(null);
  readonly savingProfile = signal(false);
  readonly changingPassword = signal(false);

  readonly profileForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(50), trimmedRequiredValidator]],
    lastName: ['', [Validators.required, Validators.maxLength(50), trimmedRequiredValidator]],
    phone: ['', [Validators.maxLength(20)]],
  });

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required, trimmedRequiredValidator]],
    newPassword: ['', [Validators.required, Validators.minLength(8), trimmedRequiredValidator]],
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  reloadProfile(): void {
    this.loadProfile(true);
  }

  saveProfile(): void {
    if (this.profileForm.invalid || this.savingProfile()) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.savingProfile.set(true);
    this.profileSubmitError.set(null);

    const request: UpdateProfileRequest = {
      firstName: this.profileForm.controls.firstName.value.trim(),
      lastName: this.profileForm.controls.lastName.value.trim(),
      phone: this.profileForm.controls.phone.value.trim(),
    };

    this.authService.updateProfile(request).subscribe({
      next: (user) => {
        this.savingProfile.set(false);
        const profile = user ?? this.authService.currentUser();
        if (profile) {
          this.syncProfileForm(profile);
        }
        this.toast.success('Perfil actualizado correctamente');
      },
      error: (err: HttpErrorResponse) => {
        this.savingProfile.set(false);
        const message = this.resolveProfileError(err);
        this.profileSubmitError.set(message);
        this.toast.error(message);
      },
    });
  }

  resetProfile(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.syncProfileForm(user);
    }
  }

  changePassword(): void {
    if (this.passwordForm.invalid || this.changingPassword() || !this.isLocalAccount()) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.changingPassword.set(true);
    this.passwordSubmitError.set(null);

    const request: ChangePasswordRequest = {
      currentPassword: this.passwordForm.controls.currentPassword.value,
      newPassword: this.passwordForm.controls.newPassword.value,
    };

    this.authService.changePassword(request).subscribe({
      next: () => {
        this.changingPassword.set(false);
        this.passwordForm.reset({ currentPassword: '', newPassword: '' });
        this.passwordForm.markAsPristine();
        this.passwordForm.markAsUntouched();
        this.toast.success('Contraseña actualizada correctamente');
      },
      error: (err: HttpErrorResponse) => {
        this.changingPassword.set(false);
        const message = this.resolvePasswordError(err);
        this.passwordSubmitError.set(message);
        this.toast.error(message);
      },
    });
  }

  isLocalAccount(): boolean {
    return (this.authService.currentUser()?.provider ?? '').toUpperCase() === 'LOCAL';
  }

  providerLabel(provider: string | null | undefined): string {
    if (!provider) {
      return 'Desconocido';
    }

    return provider.toUpperCase() === 'LOCAL' ? 'Local' : provider;
  }

  private loadProfile(force = false): void {
    this.loading.set(true);
    this.profileLoadError.set(null);

    this.authService.loadCurrentUserProfile(force).subscribe({
      next: (profile) => {
        const user = profile ?? this.authService.currentUser();
        if (user) {
          this.syncProfileForm(user);
        }
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.profileLoadError.set(this.resolveLoadError(err));
      },
    });
  }

  private syncProfileForm(user: UserProfile): void {
    this.profileForm.reset({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phone: user.defaultPhone ?? '',
    });
    this.profileForm.markAsPristine();
    this.profileForm.markAsUntouched();
    this.profileSubmitError.set(null);
  }

  private resolveLoadError(err: HttpErrorResponse): string {
    if (!err.status || err.status === 0) {
      return 'No pudimos conectar con el servidor. Verificá tu conexión e intentá otra vez.';
    }

    if (err.status === 401 || err.status === 403) {
      return 'Tu sesión no pudo validarse. Volvé a iniciar sesión para ver tu perfil.';
    }

    if (err.status >= 500) {
      return 'El servidor no respondió como esperaba. Intentá nuevamente en unos minutos.';
    }

    return 'No pudimos cargar tu perfil en este momento.';
  }

  private resolveProfileError(err: HttpErrorResponse): string {
    const body = err.error as ErrorResponse;
    const fallback = body?.message ?? 'No pudimos actualizar tu perfil. Intentá de nuevo.';

    if (!err.status || err.status === 0) {
      return 'No pudimos conectar con el servidor. Verificá tu conexión e intentá otra vez.';
    }

    if (err.status === 400 || err.status === 409) {
      return fallback;
    }

    if (err.status === 401 || err.status === 403) {
      return 'Tu sesión no pudo validarse. Volvé a iniciar sesión e intentá de nuevo.';
    }

    if (err.status >= 500) {
      return 'El servidor no respondió como esperaba. Intentá nuevamente en unos minutos.';
    }

    return fallback;
  }

  private resolvePasswordError(err: HttpErrorResponse): string {
    const body = err.error as ErrorResponse;

    if (!err.status || err.status === 0) {
      return 'No pudimos conectar con el servidor. Verificá tu conexión e intentá otra vez.';
    }

    if (err.status === 409) {
      if (!this.isLocalAccount()) {
        return 'Tu cuenta usa un proveedor externo. La contraseña no se cambia desde aquí.';
      }

      return 'La contraseña actual no es correcta.';
    }

    if (err.status === 400) {
      return body?.message ?? 'Revisá los datos de la contraseña e intentá de nuevo.';
    }

    if (err.status === 401 || err.status === 403) {
      return 'Tu sesión no pudo validarse. Volvé a iniciar sesión e intentá de nuevo.';
    }

    if (err.status >= 500) {
      return 'El servidor no respondió como esperaba. Intentá nuevamente en unos minutos.';
    }

    return body?.message ?? 'No pudimos cambiar tu contraseña. Intentá de nuevo.';
  }
}
