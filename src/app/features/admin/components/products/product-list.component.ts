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
  templateUrl: './product-list.component.html',
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
