import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/http/api-endpoints';
import { CartItem } from '../../../core/services/cart-state.service';

const PENDING_CHECKOUT_ORDER_ID_KEY = 'pending_checkout_order_id';
const TOKEN_KEY = 'auth_token';

export type DeliveryMethod = 'STORE_PICKUP' | 'SHIPPING';

export interface CheckoutPreferenceRequest {
  items: { productId: number; quantity: number }[];
  deliveryMethod: DeliveryMethod;
  shippingAddress?: string;
  zipCode?: string;
  shippingCost?: number;
  contactPhone: string;
  savePhoneToProfile?: boolean;
}

export interface CheckoutPreferenceResponse {
  initPoint: string;
  orderId: number;
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  createPreference(
    cartItems: CartItem[],
    deliveryMethod: DeliveryMethod,
    contactPhone: string,
    savePhoneToProfile?: boolean,
    shippingAddress?: string,
    zipCode?: string,
    shippingCost?: number,
  ): Observable<CheckoutPreferenceResponse> {
    const body: CheckoutPreferenceRequest = {
      items: cartItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      deliveryMethod,
      contactPhone,
      ...(savePhoneToProfile !== undefined && { savePhoneToProfile }),
      ...(deliveryMethod === 'SHIPPING' && { shippingAddress, zipCode, shippingCost }),
    };
    return this.http.post<CheckoutPreferenceResponse>(
      API_ENDPOINTS.CHECKOUT.CREATE_PREFERENCE,
      body,
    );
  }

  cancelOrder(orderId: number): Observable<void> {
    return this.http.delete<void>(API_ENDPOINTS.ORDERS.BY_ID(orderId));
  }

  storePendingOrderId(orderId: number): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const storageKey = this.pendingOrderStorageKey();
    localStorage.setItem(storageKey, String(orderId));

    if (storageKey !== PENDING_CHECKOUT_ORDER_ID_KEY) {
      localStorage.removeItem(PENDING_CHECKOUT_ORDER_ID_KEY);
    }
  }

  getPendingOrderId(): number | null {
    if (!isPlatformBrowser(this.platformId)) return null;

    const storageKey = this.pendingOrderStorageKey();
    if (storageKey !== PENDING_CHECKOUT_ORDER_ID_KEY) {
      localStorage.removeItem(PENDING_CHECKOUT_ORDER_ID_KEY);
    }

    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  clearPendingOrderId(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const storageKey = this.pendingOrderStorageKey();
    localStorage.removeItem(storageKey);

    if (storageKey !== PENDING_CHECKOUT_ORDER_ID_KEY) {
      localStorage.removeItem(PENDING_CHECKOUT_ORDER_ID_KEY);
    }
  }

  private pendingOrderStorageKey(): string {
    const userId = this.currentUserId();
    return userId ? `${PENDING_CHECKOUT_ORDER_ID_KEY}_${userId}` : PENDING_CHECKOUT_ORDER_ID_KEY;
  }

  private currentUserId(): number | null {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload)) as { userId?: number };
      const parsed = Number(decoded.userId);
      return Number.isFinite(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}
