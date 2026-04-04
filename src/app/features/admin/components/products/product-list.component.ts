import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { ProductResponse, PageResponse } from '../../models/admin.models';
import { ToastService } from '../../../../shared/services/toast.service';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-display tracking-tight text-brand-black">Productos</h2>
        <a
          routerLink="new"
          class="bg-brand-black text-brand-white px-5 py-2.5 rounded-lg font-display text-sm uppercase tracking-wider hover:bg-brand-dark transition-colors"
        >
          + Nuevo producto
        </a>
      </div>

      @if (loading()) {
        <div class="text-center py-12 text-brand-gray">Cargando productos...</div>
      } @else {
        <div class="bg-brand-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-200">
                  <th
                    class="text-left px-4 py-3 font-display uppercase tracking-wider text-xs text-brand-gray"
                  >
                    SKU
                  </th>
                  <th
                    class="text-left px-4 py-3 font-display uppercase tracking-wider text-xs text-brand-gray"
                  >
                    Nombre
                  </th>
                  <th
                    class="text-left px-4 py-3 font-display uppercase tracking-wider text-xs text-brand-gray"
                  >
                    Categoría
                  </th>
                  <th
                    class="text-right px-4 py-3 font-display uppercase tracking-wider text-xs text-brand-gray"
                  >
                    Precio
                  </th>
                  <th
                    class="text-right px-4 py-3 font-display uppercase tracking-wider text-xs text-brand-gray"
                  >
                    Stock
                  </th>
                  <th
                    class="text-center px-4 py-3 font-display uppercase tracking-wider text-xs text-brand-gray"
                  >
                    Estado
                  </th>
                  <th
                    class="text-right px-4 py-3 font-display uppercase tracking-wider text-xs text-brand-gray"
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (product of products(); track product.id) {
                  <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td class="px-4 py-3 font-mono text-xs text-brand-gray">{{ product.sku }}</td>
                    <td class="px-4 py-3 font-medium text-brand-black">{{ product.name }}</td>
                    <td class="px-4 py-3 text-brand-gray">{{ product.category.name }}</td>
                    <td class="px-4 py-3 text-right tabular-nums">
                      {{ product.price | currency: 'ARS' : 'symbol' : '1.0-0' }}
                    </td>
                    <td class="px-4 py-3 text-right tabular-nums">{{ product.stock }}</td>
                    <td class="px-4 py-3 text-center">
                      <span
                        class="inline-block px-2 py-0.5 rounded-full text-xs font-bold uppercase"
                        [class]="
                          product.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        "
                      >
                        {{ product.isActive ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right">
                      <div class="flex items-center justify-end gap-2">
                        <a
                          [routerLink]="[product.id, 'edit']"
                          class="text-brand-gray hover:text-brand-black transition-colors text-xs font-display uppercase tracking-wider"
                        >
                          Editar
                        </a>
                        <button
                          (click)="deleteProduct(product)"
                          class="text-red-500 hover:text-red-700 transition-colors text-xs font-display uppercase tracking-wider"
                        >
                          Baja
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="text-center py-8 text-brand-gray">
                      No hay productos registrados.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        @if (totalPages() > 1) {
          <div class="flex items-center justify-center gap-2 pt-4">
            <button
              (click)="goToPage(currentPage() - 1)"
              [disabled]="currentPage() === 0"
              class="px-3 py-1.5 rounded-lg text-sm border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition-colors"
            >
              ← Anterior
            </button>
            <span class="text-sm text-brand-gray px-3">
              Página {{ currentPage() + 1 }} de {{ totalPages() }}
            </span>
            <button
              (click)="goToPage(currentPage() + 1)"
              [disabled]="currentPage() + 1 >= totalPages()"
              class="px-3 py-1.5 rounded-lg text-sm border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition-colors"
            >
              Siguiente →
            </button>
          </div>
        }
      }
    </div>
  `,
})
export class ProductListComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly toast = inject(ToastService);

  products = signal<ProductResponse[]>([]);
  loading = signal(true);
  currentPage = signal(0);
  totalPages = signal(0);

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading.set(true);
    this.productService.getProducts(this.currentPage()).subscribe({
      next: (res) => {
        this.products.set(res.content);
        this.totalPages.set(res.page.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar productos');
        this.loading.set(false);
      },
    });
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadProducts();
  }

  deleteProduct(product: ProductResponse): void {
    if (!confirm(`¿Dar de baja el producto "${product.name}"?`)) return;
    this.productService.delete(product.id).subscribe({
      next: () => {
        this.toast.success('Producto dado de baja');
        this.loadProducts();
      },
      error: () => this.toast.error('Error al dar de baja el producto'),
    });
  }
}
