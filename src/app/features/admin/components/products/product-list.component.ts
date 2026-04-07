import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { ProductResponse, PageResponse } from '../../models/admin.models';
import { ToastService } from '../../../../shared/services/toast.service';
import { CurrencyPipe } from '@angular/common';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, ConfirmModalComponent],
  templateUrl: './product-list.component.html',
})
export class ProductListComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly toast = inject(ToastService);

  products = signal<ProductResponse[]>([]);
  loading = signal(true);
  currentPage = signal(0);
  totalPages = signal(0);

  showDeleteModal = signal(false);
  productToDelete = signal<ProductResponse | null>(null);

  showActivateModal = signal(false);
  productToActivate = signal<ProductResponse | null>(null);

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

  openDeleteModal(product: ProductResponse): void {
    this.productToDelete.set(product);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.productToDelete.set(null);
  }

  confirmDelete(): void {
    const product = this.productToDelete();
    if (!product) return;
    this.closeDeleteModal();
    this.productService.delete(product.id).subscribe({
      next: () => {
        this.toast.success('Producto dado de baja');
        this.loadProducts();
      },
      error: () => this.toast.error('Error al dar de baja el producto'),
    });
  }

  openActivateModal(product: ProductResponse): void {
    this.productToActivate.set(product);
    this.showActivateModal.set(true);
  }

  closeActivateModal(): void {
    this.showActivateModal.set(false);
    this.productToActivate.set(null);
  }

  confirmActivate(): void {
    const product = this.productToActivate();
    if (!product) return;
    this.closeActivateModal();
    this.productService.activate(product.id).subscribe({
      next: () => {
        this.toast.success('Producto dado de alta');
        this.loadProducts();
      },
      error: () => this.toast.error('Error al dar de alta el producto'),
    });
  }
}
