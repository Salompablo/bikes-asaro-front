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
import { API_ENDPOINTS } from '../../../core/http/api-endpoints';

const TOKEN_KEY = 'auth_token';

interface JwtPayload {
  sub?: string;
  userId?: number;
  role?: string;
  firstName?: string;
  exp?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly tokenSignal = signal<string | null>(this.loadToken());

  readonly isLoggedIn = computed(() => !!this.tokenSignal());
  readonly role = computed(() => this.decodeToken()?.role?.replace('ROLE_', '') ?? null);
  readonly isAdmin = computed(() => this.role() === 'ADMIN');
  readonly userEmail = computed(() => this.decodeToken()?.sub ?? null);
  readonly userId = computed(() => this.decodeToken()?.userId ?? null);
  readonly firstName = computed(() => this.decodeToken()?.firstName ?? null);

  getToken(): string | null {
    return this.tokenSignal();
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, request);
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, request)
      .pipe(tap((res) => this.storeToken(res.token)));
  }

  googleLogin(request: GoogleLoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(API_ENDPOINTS.AUTH.GOOGLE, request)
      .pipe(tap((res) => this.storeToken(res.token)));
  }

  verifyEmail(token: string): Observable<AuthResponse> {
    const params = new HttpParams().set('token', token);
    return this.http
      .post<AuthResponse>(API_ENDPOINTS.AUTH.VERIFY, null, { params })
      .pipe(tap((res) => this.storeToken(res.token)));
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, request);
  }

  resetPassword(request: ResetPasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(API_ENDPOINTS.AUTH.RESET_PASSWORD, request);
  }

  requestReactivation(email: string): Observable<void> {
    const params = new HttpParams().set('email', email);
    return this.http.post<void>(API_ENDPOINTS.AUTH.REQUEST_REACTIVATION, null, { params });
  }

  reactivate(token: string): Observable<AuthResponse> {
    const params = new HttpParams().set('token', token);
    return this.http
      .post<AuthResponse>(API_ENDPOINTS.AUTH.REACTIVATE, null, { params })
      .pipe(tap((res) => this.storeToken(res.token)));
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

  private decodeToken(): JwtPayload | null {
    const token = this.tokenSignal();
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      console.log('[AuthService] JWT decoded:', decoded);
      return decoded;
    } catch {
      return null;
    }
  }
}
