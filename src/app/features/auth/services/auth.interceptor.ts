import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { SessionExpiryService } from './session-expiry.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const sessionExpiryService = inject(SessionExpiryService);

  if (req.url.includes('/auth/') || req.url.startsWith('http')) {
    return next(req);
  }

  const token = authService.getToken();

  const request = token
    ? req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      })
    : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && token) {
        sessionExpiryService.handleUnauthorizedResponse();
      }

      return throwError(() => error);
    }),
  );
};
