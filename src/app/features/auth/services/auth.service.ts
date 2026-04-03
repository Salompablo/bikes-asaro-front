import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import {
  AuthResponse,
  ForgotPasswordRequest,
  GoogleLoginRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '../models/auth.models';

const TOKEN_KEY = 'auth_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly tokenSignal = signal<string | null>(this.loadToken());

  readonly isLoggedIn = computed(() => !!this.tokenSignal());

  getToken(): string | null {
    return this.tokenSignal();
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/register', request);
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/login', request).pipe(
      tap(res => this.storeToken(res.token)),
    );
  }

  googleLogin(request: GoogleLoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/google', request).pipe(
      tap(res => this.storeToken(res.token)),
    );
  }

  verifyEmail(token: string): Observable<AuthResponse> {
    const params = new HttpParams().set('token', token);
    return this.http.post<AuthResponse>('/auth/verify', null, { params }).pipe(
      tap(res => this.storeToken(res.token)),
    );
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/auth/forgot-password', request);
  }

  resetPassword(request: ResetPasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/auth/reset-password', request);
  }

  requestReactivation(email: string): Observable<void> {
    const params = new HttpParams().set('email', email);
    return this.http.post<void>('/auth/request-reactivation', null, { params });
  }

  reactivate(token: string): Observable<AuthResponse> {
    const params = new HttpParams().set('token', token);
    return this.http.post<AuthResponse>('/auth/reactivate', null, { params }).pipe(
      tap(res => this.storeToken(res.token)),
    );
  }

  logout(): void {
    this.tokenSignal.set(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  private storeToken(token: string): void {
    this.tokenSignal.set(token);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(TOKEN_KEY, token);
    }
  }

  private loadToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  }
}
