import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/http/api-endpoints';
import { CartItem } from '../../../core/services/cart-state.service';

export type DeliveryMethod = 'STORE_PICKUP' | 'SHIPPING';

export interface CheckoutPreferenceRequest {
  items: { productId: number; quantity: number }[];
  deliveryMethod: DeliveryMethod;
  shippingAddress?: string;
  zipCode?: string;
  shippingCost?: number;
}

export interface CheckoutPreferenceResponse {
  initPoint: string;
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly http = inject(HttpClient);

  createPreference(
    cartItems: CartItem[],
    deliveryMethod: DeliveryMethod,
    shippingAddress?: string,
    zipCode?: string,
    shippingCost?: number,
  ): Observable<CheckoutPreferenceResponse> {
    const body: CheckoutPreferenceRequest = {
      items: cartItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      deliveryMethod,
      ...(deliveryMethod === 'SHIPPING' && { shippingAddress, zipCode, shippingCost }),
    };
    return this.http.post<CheckoutPreferenceResponse>(
      API_ENDPOINTS.CHECKOUT.CREATE_PREFERENCE,
      body,
    );
  }
}
