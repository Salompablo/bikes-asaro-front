import { Routes } from '@angular/router';

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
    path: '',
    pathMatch: 'full',
    redirectTo: 'catalog',
  },
];
