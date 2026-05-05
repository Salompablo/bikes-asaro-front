import { Routes } from '@angular/router';
import { authGuard } from './features/auth/services/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((r) => r.authRoutes),
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then((r) => r.adminRoutes),
  },
  {
    path: 'catalog',
    loadComponent: () =>
      import('./features/catalog/catalog.component').then((c) => c.CatalogComponent),
  },
  {
    path: 'products/:id',
    loadComponent: () =>
      import('./features/catalog/product-detail/product-detail.component').then(
        (c) => c.ProductDetailComponent,
      ),
  },
  {
    path: 'checkout',
    loadComponent: () =>
      import('./features/checkout/checkout.component').then((c) => c.CheckoutComponent),
  },
  {
    path: 'checkout/success',
    loadComponent: () =>
      import('./features/checkout/checkout-success.component').then(
        (c) => c.CheckoutSuccessComponent,
      ),
  },
  {
    path: 'checkout/failure',
    loadComponent: () =>
      import('./features/checkout/checkout-failure.component').then(
        (c) => c.CheckoutFailureComponent,
      ),
  },
  {
    path: 'checkout/pending',
    loadComponent: () =>
      import('./features/checkout/checkout-pending.component').then(
        (c) => c.CheckoutPendingComponent,
      ),
  },
  {
    path: 'orders',
    loadComponent: () =>
      import('./features/orders/my-orders.component').then((c) => c.MyOrdersComponent),
    canActivate: [authGuard],
  },
  {
    path: 'orders/:id',
    loadComponent: () =>
      import('./features/orders/order-detail.component').then((c) => c.OrderDetailComponent),
    canActivate: [authGuard],
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'catalog',
  },
];
