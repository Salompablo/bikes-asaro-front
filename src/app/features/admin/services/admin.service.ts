import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { OrderResponse, OrderStatus, PageResponse, UserResponse } from '../models/admin.models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  getOrders(page = 0, size = 10): Observable<PageResponse<OrderResponse>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageResponse<OrderResponse>>('/admin/orders', { params });
  }

  updateOrderStatus(id: number, status: OrderStatus): Observable<OrderResponse> {
    const params = new HttpParams().set('status', status);
    return this.http.patch<OrderResponse>(`/admin/orders/${id}/status`, null, { params });
  }

  getUsers(page = 0, size = 20): Observable<PageResponse<UserResponse>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageResponse<UserResponse>>('/admin/users', { params });
  }
}
