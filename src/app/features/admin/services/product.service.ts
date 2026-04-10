import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PageResponse, ProductRequest, ProductResponse } from '../models/admin.models';
import { API_ENDPOINTS } from '../../../core/http/api-endpoints';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);

  getProducts(
    page = 0,
    size = 10,
    categoryId?: number,
    search?: string,
  ): Observable<PageResponse<ProductResponse>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (categoryId) params = params.set('categoryId', categoryId);
    if (search) params = params.set('search', search);
    return this.http.get<PageResponse<ProductResponse>>(API_ENDPOINTS.PRODUCTS.BASE, { params });
  }

  getAllProducts(
    page = 0,
    size = 10,
  ): Observable<PageResponse<ProductResponse>> {
    const params = new HttpParams().set('page', page).set('size', size);
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
