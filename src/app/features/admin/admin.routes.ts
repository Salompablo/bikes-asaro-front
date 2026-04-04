import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin-dashboard.component').then((c) => c.AdminDashboardComponent),
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'products', pathMatch: 'full' },
      {
        path: 'products',
        loadComponent: () =>
          import('./components/products/product-list.component').then(
            (c) => c.ProductListComponent,
          ),
      },
      {
        path: 'products/new',
        loadComponent: () =>
          import('./components/products/product-form.component').then(
            (c) => c.ProductFormComponent,
          ),
      },
      {
        path: 'products/:id/edit',
        loadComponent: () =>
          import('./components/products/product-form.component').then(
            (c) => c.ProductFormComponent,
          ),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./components/categories/category-list.component').then(
            (c) => c.CategoryListComponent,
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./components/orders/order-list.component').then((c) => c.OrderListComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./components/users/user-list.component').then((c) => c.UserListComponent),
      },
    ],
  },
];
