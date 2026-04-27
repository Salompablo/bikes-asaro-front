import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PageResponse, ProductRequest, ProductResponse } from '../models/admin.models';
import { API_ENDPOINTS } from '../../../core/http/api-endpoints';
import { ProductFilterRequest } from '../../catalog/models/catalog.models';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);

  getPublicProducts(filters: ProductFilterRequest): Observable<PageResponse<ProductResponse>> {
    let params = new HttpParams()
      .set('page', filters.page)
      .set('size', filters.size)
      .set('sortField', filters.sortField)
      .set('sortDirection', filters.sortDirection);
    if (filters.categoryId != null) params = params.set('categoryId', filters.categoryId);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.minPrice != null) params = params.set('minPrice', filters.minPrice);
    if (filters.maxPrice != null) params = params.set('maxPrice', filters.maxPrice);
    if (filters.inStock != null) params = params.set('inStock', filters.inStock);
    return this.http.get<PageResponse<ProductResponse>>(API_ENDPOINTS.PRODUCTS.BASE, { params });
  }

  getAllProducts(
    page = 0,
    size = 10,
    sortField = 'name',
    sortDirection = 'asc',
  ): Observable<PageResponse<ProductResponse>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sortField', sortField)
      .set('sortDirection', sortDirection);
    return this.http.get<PageResponse<ProductResponse>>(API_ENDPOINTS.PRODUCTS.ADMIN, { params });
  }

  getById(id: number): Observable<ProductResponse> {
    return this.http.get<ProductResponse>(API_ENDPOINTS.PRODUCTS.BY_ID(id));
  }

  create(request: ProductRequest): Observable<ProductResponse> {
    return this.http.post<ProductResponse>(API_ENDPOINTS.PRODUCTS.BASE, request);
  }

  update(id: number, request: ProductRequest): Observable<ProductResponse> {
    return this.http.put<ProductResponse>(API_ENDPOINTS.PRODUCTS.BY_ID(id), request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(API_ENDPOINTS.PRODUCTS.BY_ID(id));
  }

  activate(id: number): Observable<void> {
    return this.http.patch<void>(API_ENDPOINTS.PRODUCTS.ACTIVATE(id), null);
  }
}
