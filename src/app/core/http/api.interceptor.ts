import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const isAbsoluteUrl = req.url.startsWith('http://') || req.url.startsWith('https://');

  if (isAbsoluteUrl) {
    return next(req);
  }

  const endpoint = req.url.startsWith('/') ? req.url : `/${req.url}`;

  const apiReq = req.clone({
    url: `${environment.apiUrl}${endpoint}`,
  });

  return next(apiReq);
};
