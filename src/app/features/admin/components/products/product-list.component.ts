import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { ProductResponse, PageResponse } from '../../models/admin.models';
import { ToastService } from '../../../../shared/services/toast.service';
import { CurrencyPipe } from '@angular/common';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';
import { HttpErrorResponse } from '@angular/common/http';

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
  sortField = signal<'name' | 'price' | 'stock' | 'createdAt'>('name');
  sortDirection = signal<'asc' | 'desc'>('asc');

  showDeleteModal = signal(false);
  productToDelete = signal<ProductResponse | null>(null);

  showActivateModal = signal(false);
  productToActivate = signal<ProductResponse | null>(null);

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading.set(true);
    this.productService.getAllProducts(this.currentPage(), 10, this.sortField(), this.sortDirection()).subscribe({
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

  changeSort(field: 'name' | 'price' | 'stock' | 'createdAt'): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
    this.currentPage.set(0);
    this.loadProducts();
  }

  sortIndicator(field: 'name' | 'price' | 'stock' | 'createdAt'): string {
    if (this.sortField() !== field) return '↕';
    return this.sortDirection() === 'asc' ? '↑' : '↓';
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
      error: (err: HttpErrorResponse) => {
        const msg = err.error?.message ?? '';
        const toast = msg.toLowerCase().includes('inactive category')
          ? 'La categoría de este producto está desactivada. Reactivala primero para poder dar de alta el producto.'
          : 'Error al dar de alta el producto';
        this.toast.error(toast);
      },
    });
  }

  productImage(product: ProductResponse): string {
    const firstImage = product.images.find((img) => !!img?.trim());
    return firstImage ? firstImage.trim() : this.placeholderImage();
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = this.placeholderImage();
  }

  private placeholderImage(): string {
    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-family="Arial" font-size="11">Sin imagen</text></svg>';
  }
}
