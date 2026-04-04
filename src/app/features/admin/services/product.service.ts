import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PageResponse, ProductRequest, ProductResponse } from '../models/admin.models';

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
    return this.http.get<PageResponse<ProductResponse>>('/products', { params });
  }

  getById(id: number): Observable<ProductResponse> {
    return this.http.get<ProductResponse>(`/products/${id}`);
  }

  create(request: ProductRequest): Observable<ProductResponse> {
    return this.http.post<ProductResponse>('/products', request);
  }

  update(id: number, request: ProductRequest): Observable<ProductResponse> {
    return this.http.put<ProductResponse>(`/products/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`/products/${id}`);
  }
}
