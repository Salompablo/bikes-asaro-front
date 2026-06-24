import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, EMPTY } from 'rxjs';
import { CategoryResponse, ProductResponse } from '../admin/models/admin.models';
import { CategoryService } from '../admin/services/category.service';
import { ProductService } from '../admin/services/product.service';
import { DEFAULT_FILTERS } from '../catalog/models/catalog.models';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly toast = inject(ToastService);

  readonly featuredProducts = signal<ProductResponse[]>([]);
  readonly categories = signal<CategoryResponse[]>([]);
  readonly loadingFeatured = signal(true);
  readonly loadingCategories = signal(true);

  ngOnInit(): void {
    this.loadFeaturedProducts();
    this.loadCategories();
  }

  productImage(product: ProductResponse): string {
    const firstImage = product.images.find((img) => !!img?.trim());
    return firstImage ?? product.category.defaultImageUrl;
  }

  categoryImage(category: CategoryResponse, index: number): string {
    if (category.defaultImageUrl?.trim()) {
      return category.defaultImageUrl;
    }

    const fallbackImages = [
      'assets/images/Bikes-Asaro-Bici.jpg',
      'assets/images/Bikes-Asaro-Mural.jpg',
      'assets/images/Bikes-Asaro-Frente.jpg',
    ];

    return fallbackImages[index % fallbackImages.length];
  }

  onImageError(event: Event, fallback: string): void {
    const img = event.target as HTMLImageElement;
    if (img.src !== fallback) {
      img.src = fallback;
    }
  }

  private loadFeaturedProducts(): void {
    const filters = {
      ...DEFAULT_FILTERS,
      size: 4,
      page: 0,
      sortField: 'createdAt',
      sortDirection: 'desc',
    };

    this.productService
      .getPublicProducts(filters)
      .pipe(
        catchError(() => {
          this.toast.error('No pudimos cargar destacados en este momento.');
          this.loadingFeatured.set(false);
          return EMPTY;
        }),
      )
      .subscribe((res) => {
        this.featuredProducts.set(res.content);
        this.loadingFeatured.set(false);
      });
  }

  private loadCategories(): void {
    this.categoryService
      .getActive(0, 6)
      .pipe(
        catchError(() => {
          this.toast.error('No pudimos cargar categorias en este momento.');
          this.loadingCategories.set(false);
          return EMPTY;
        }),
      )
      .subscribe((res) => {
        this.categories.set(res.content);
        this.loadingCategories.set(false);
      });
  }
}
