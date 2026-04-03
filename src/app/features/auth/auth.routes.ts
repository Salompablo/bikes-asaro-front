import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then(c => c.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register.component').then(c => c.RegisterComponent),
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./verify-email/verify-email.component').then(c => c.VerifyEmailComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./forgot-password/forgot-password.component').then(c => c.ForgotPasswordComponent),
  },
];
