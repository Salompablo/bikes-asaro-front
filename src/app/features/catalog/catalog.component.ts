import { Component, inject, OnInit, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, EMPTY, switchMap } from 'rxjs';
import { ProductService } from '../admin/services/product.service';
import { CategoryService } from '../admin/services/category.service';
import { CategoryResponse, PageResponse, ProductResponse } from '../admin/models/admin.models';
import { ToastService } from '../../shared/services/toast.service';
import { DEFAULT_FILTERS, ProductFilterRequest, SORT_OPTIONS } from './models/catalog.models';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './catalog.component.html',
})
export class CatalogComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly toast = inject(ToastService);

  readonly sortOptions = SORT_OPTIONS;

  filters = signal<ProductFilterRequest>({ ...DEFAULT_FILTERS });
  products = signal<ProductResponse[]>([]);
  categories = signal<CategoryResponse[]>([]);
  totalPages = signal(0);
  totalElements = signal(0);
  loading = signal(true);

  private readonly products$ = toObservable(this.filters).pipe(
    debounceTime(300),
    switchMap((f) => {
      this.loading.set(true);
      return this.productService.getPublicProducts(f).pipe(
        catchError(() => {
          this.toast.error('Error al cargar productos');
          this.loading.set(false);
          return EMPTY;
        }),
      );
    }),
  );

  ngOnInit(): void {
    this.categoryService.getActive().subscribe((cats) => this.categories.set(cats));

    this.products$.subscribe((res: PageResponse<ProductResponse>) => {
      this.products.set(res.content);
      this.totalPages.set(res.page.totalPages);
      this.totalElements.set(res.page.totalElements);
      this.loading.set(false);
    });
  }

  changeCategory(categoryId?: number): void {
    this.filters.update((f) => ({ ...f, categoryId, page: 0 }));
  }

  changeSort(sort: string): void {
    this.filters.update((f) => ({ ...f, sort, page: 0 }));
  }

  changeSearch(search: string): void {
    this.filters.update((f) => ({ ...f, search: search || undefined, page: 0 }));
  }

  goToPage(page: number): void {
    this.filters.update((f) => ({ ...f, page }));
  }

  get currentPage(): number {
    return this.filters().page;
  }

  productImage(product: ProductResponse): string {
    const firstImage = product.images.find((img) => !!img?.trim());
    return firstImage ?? product.category.defaultImageUrl;
  }

  onImageError(event: Event, product: ProductResponse): void {
    const img = event.target as HTMLImageElement;
    const fallback = product.category.defaultImageUrl;
    if (img.src !== fallback) {
      img.src = fallback;
    }
  }
}
