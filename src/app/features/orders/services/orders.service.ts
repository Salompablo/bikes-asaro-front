import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, map, of, switchMap, throwError } from 'rxjs';
import { OrderResponse, PageResponse } from '../../admin/models/admin.models';
import { API_ENDPOINTS } from '../../../core/http/api-endpoints';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);

  getMyOrders(page = 0, size = 10): Observable<PageResponse<OrderResponse>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageResponse<OrderResponse>>(API_ENDPOINTS.ORDERS.MY_ORDERS, { params });
  }

  getOrderById(orderId: number): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(API_ENDPOINTS.ORDERS.MY_ORDER_BY_ID(orderId)).pipe(
      catchError(() =>
        this.getMyOrders(0, 100).pipe(
          map((response) => response.content.find((order) => order.id === orderId) ?? null),
          switchMap((order) =>
            order ? of(order) : throwError(() => new Error('Order not found for current user')),
          ),
        ),
      ),
    );
  }
}
