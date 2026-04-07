import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CategoryRequest, CategoryResponse } from '../models/admin.models';
import { API_ENDPOINTS } from '../../../core/http/api-endpoints';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<CategoryResponse[]> {
    return this.http.get<CategoryResponse[]>(API_ENDPOINTS.CATEGORIES.BASE);
  }

  getActive(): Observable<CategoryResponse[]> {
    return this.http.get<CategoryResponse[]>(API_ENDPOINTS.CATEGORIES.ACTIVE);
  }

  getById(id: number): Observable<CategoryResponse> {
    return this.http.get<CategoryResponse>(API_ENDPOINTS.CATEGORIES.BY_ID(id));
  }

  create(request: CategoryRequest): Observable<CategoryResponse> {
    return this.http.post<CategoryResponse>(API_ENDPOINTS.CATEGORIES.BASE, request);
  }

  update(id: number, request: CategoryRequest): Observable<CategoryResponse> {
    return this.http.put<CategoryResponse>(API_ENDPOINTS.CATEGORIES.BY_ID(id), request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(API_ENDPOINTS.CATEGORIES.BY_ID(id));
  }

  activate(id: number): Observable<void> {
    return this.http.patch<void>(API_ENDPOINTS.CATEGORIES.ACTIVATE(id), null);
  }
}
