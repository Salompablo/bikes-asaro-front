import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
  styleUrl: './catalog.component.css',
})
export class CatalogComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  readonly sortOptions = SORT_OPTIONS;

  filters = signal<ProductFilterRequest>({ ...DEFAULT_FILTERS });
  products = signal<ProductResponse[]>([]);
  categories = signal<CategoryResponse[]>([]);
  totalPages = signal(0);
  totalElements = signal(0);
  loading = signal(true);

  readonly activeCategoryName = computed(() => {
    const id = this.filters().categoryId;
    return id ? (this.categories().find((c) => c.id === id)?.name ?? null) : null;
  });

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
    const categoryParam = Number(this.route.snapshot.queryParamMap.get('category'));
    if (Number.isInteger(categoryParam) && categoryParam > 0) {
      this.filters.update((f) => ({ ...f, categoryId: categoryParam, page: 0 }));
    }

    this.categoryService.getActive().subscribe((res) => this.categories.set(res.content));

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

  changeSort(value: string): void {
    const [sortField, sortDirection] = value.split(',');
    this.filters.update((f) => ({ ...f, sortField, sortDirection, page: 0 }));
  }

  get currentSortValue(): string {
    const f = this.filters();
    return `${f.sortField},${f.sortDirection}`;
  }

  changeSearch(search: string): void {
    this.filters.update((f) => ({ ...f, search: search || undefined, page: 0 }));
  }

  goToPage(page: number): void {
    this.filters.update((f) => ({ ...f, page }));
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  resetFilters(): void {
    this.filters.set({ ...DEFAULT_FILTERS });
  }

  get currentPage(): number {
    return this.filters().page;
  }

  productImage(product: ProductResponse): string {
    const firstImage = product.images.find((img) => !!img?.trim());
    return firstImage ?? product.category.defaultImageUrl;
  }

  usesCategoryImage(product: ProductResponse): boolean {
    return (
      product.images.filter((img) => !!img?.trim()).length === 0 &&
      !!product.category.defaultImageUrl
    );
  }

  onImageError(event: Event, product: ProductResponse): void {
    const img = event.target as HTMLImageElement;
    const fallback = product.category.defaultImageUrl;
    if (img.src !== fallback) {
      img.src = fallback;
    }
  }
}
