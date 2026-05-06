import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, catchError, of, tap, throwError } from 'rxjs';
import {
  AuthResponse,
  ForgotPasswordRequest,
  GoogleLoginRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UserProfile,
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
  private readonly currentUserSignal = signal<UserProfile | null>(null);

  readonly token = computed(() => this.tokenSignal());
  readonly isLoggedIn = computed(() => !!this.tokenSignal());
  readonly role = computed(() => this.decodeToken()?.role?.replace('ROLE_', '') ?? null);
  readonly isAdmin = computed(() => this.role() === 'ADMIN');
  readonly userEmail = computed(() => this.decodeToken()?.sub ?? null);
  readonly userId = computed(() => this.decodeToken()?.userId ?? null);
  readonly firstName = computed(() => this.decodeToken()?.firstName ?? null);
  readonly currentUser = computed(() => this.currentUserSignal());
  readonly tokenExpiresAt = computed(() => {
    const exp = this.decodeToken()?.exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  });

  constructor() {
    if (this.tokenSignal()) {
      this.loadCurrentUserProfile().subscribe({
        error: () => {
          this.currentUserSignal.set(null);
        },
      });
    }
  }

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
    this.currentUserSignal.set(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  loadCurrentUserProfile(force = false): Observable<UserProfile | null> {
    if (!this.tokenSignal()) {
      this.currentUserSignal.set(null);
      return of(null);
    }

    if (!force && this.currentUserSignal()) {
      return of(this.currentUserSignal());
    }

    return this.http.get<UserProfile>(API_ENDPOINTS.USERS.ME).pipe(
      tap((profile) => this.currentUserSignal.set(profile)),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
          this.currentUserSignal.set(null);
        }
        return throwError(() => error);
      }),
    );
  }

  private storeToken(token: string): void {
    this.tokenSignal.set(token);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(TOKEN_KEY, token);
    }

    this.loadCurrentUserProfile(true).subscribe({
      error: () => {
        this.currentUserSignal.set(null);
      },
    });
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
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }
}
