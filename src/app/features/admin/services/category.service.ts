import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CategoryRequest, CategoryResponse } from '../models/admin.models';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<CategoryResponse[]> {
    return this.http.get<CategoryResponse[]>('/categories');
  }

  getById(id: number): Observable<CategoryResponse> {
    return this.http.get<CategoryResponse>(`/categories/${id}`);
  }

  create(request: CategoryRequest): Observable<CategoryResponse> {
    return this.http.post<CategoryResponse>('/categories', request);
  }

  update(id: number, request: CategoryRequest): Observable<CategoryResponse> {
    return this.http.put<CategoryResponse>(`/categories/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`/categories/${id}`);
  }
}
