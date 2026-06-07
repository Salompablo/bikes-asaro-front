import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AdminOrderDetailResponse,
  CheckoutResponse,
  OrderResponse,
  OrderStatus,
  PageResponse,
  PublishShippingQuoteRequest,
  UserResponse,
} from '../models/admin.models';
import { API_ENDPOINTS } from '../../../core/http/api-endpoints';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  getOrders(page = 0, size = 10): Observable<PageResponse<OrderResponse>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageResponse<OrderResponse>>(API_ENDPOINTS.ADMIN.ORDERS, { params });
  }

  getOrderById(id: number): Observable<AdminOrderDetailResponse> {
    return this.http.get<AdminOrderDetailResponse>(API_ENDPOINTS.ADMIN.ORDER_BY_ID(id));
  }

  updateOrderStatus(id: number, status: OrderStatus): Observable<OrderResponse> {
    const params = new HttpParams().set('status', status);
    return this.http.patch<OrderResponse>(API_ENDPOINTS.ADMIN.ORDER_STATUS(id), null, { params });
  }

  publishShippingQuote(id: number, shippingCost: number): Observable<CheckoutResponse> {
    const body: PublishShippingQuoteRequest = { shippingCost };
    return this.http.patch<CheckoutResponse>(API_ENDPOINTS.ADMIN.ORDER_SHIPPING_QUOTE(id), body);
  }

  getUsers(page = 0, size = 20): Observable<PageResponse<UserResponse>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageResponse<UserResponse>>(API_ENDPOINTS.ADMIN.USERS, { params });
  }
}
