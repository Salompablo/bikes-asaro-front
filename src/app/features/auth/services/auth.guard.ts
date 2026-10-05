import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }

  // Send the user back to the page they asked for once they sign in.
  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};
