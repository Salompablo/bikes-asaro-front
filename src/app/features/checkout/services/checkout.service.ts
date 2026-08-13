import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ParamMap } from '@angular/router';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/http/api-endpoints';
import { CartItem } from '../../../core/services/cart-state.service';
import { OrderResponse } from '../../admin/models/admin.models';

const PENDING_CHECKOUT_ORDER_ID_KEY = 'pending_checkout_order_id';
const PENDING_MERCADO_PAGO_RETURN_PARAMS_KEY = 'pending_checkout_return_params';
const TOKEN_KEY = 'auth_token';

export interface MercadoPagoReturnParams {
  collectionId: string;
  externalReference: string;
}

export type DeliveryMethod = 'STORE_PICKUP' | 'SHIPPING';

export interface CheckoutPreferenceRequest {
  items: { productId: number; quantity: number }[];
  deliveryMethod: DeliveryMethod;
  shippingAddress?: string;
  zipCode?: string;
  contactPhone: string;
  savePhoneToProfile?: boolean;
}

export interface CheckoutPreferenceResponse {
  requiresShippingQuote: boolean;
  payableNow: boolean;
  flowStatus: string;
  checkoutUrl?: string | null;
  quoteExpiresAt?: string | null;
  initPoint: string | null;
  preferenceId: string | null;
  orderId: number;
}

export interface ShippingQuoteResponse {
  provider: string;
  cost: number;
  estimatedDays: number;
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
  ): Observable<CheckoutPreferenceResponse> {
    const body: CheckoutPreferenceRequest = {
      items: cartItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      deliveryMethod,
      contactPhone,
      ...(savePhoneToProfile !== undefined && { savePhoneToProfile }),
      ...(deliveryMethod === 'SHIPPING' && { shippingAddress, zipCode }),
    };
    return this.http.post<CheckoutPreferenceResponse>(
      API_ENDPOINTS.CHECKOUT.CREATE_PREFERENCE,
      body,
    );
  }

  getShippingQuote(zipCode: string, totalWeight: number): Observable<ShippingQuoteResponse> {
    return this.http.get<ShippingQuoteResponse>(API_ENDPOINTS.SHIPPING.QUOTE, {
      params: {
        zipCode,
        totalWeight,
      },
    });
  }

  confirmCheckout(collectionId: string, externalReference: string): Observable<OrderResponse> {
    const params = new HttpParams()
      .set('collection_id', collectionId)
      .set('external_reference', externalReference);

    return this.http.get<OrderResponse>(API_ENDPOINTS.CHECKOUT.CONFIRM, { params });
  }

  cancelOrder(orderId: number): Observable<void> {
    return this.http.delete<void>(API_ENDPOINTS.ORDERS.BY_ID(orderId));
  }

  getMercadoPagoReturnParams(
    queryParamMap?: Pick<ParamMap, 'get'>,
  ): MercadoPagoReturnParams | null {
    const collectionId = queryParamMap?.get('collection_id')?.trim();
    const externalReference = queryParamMap?.get('external_reference')?.trim();

    if (!collectionId || !externalReference) {
      return null;
    }

    return { collectionId, externalReference };
  }

  storePendingMercadoPagoReturnParams(params: MercadoPagoReturnParams): void {
    if (!isPlatformBrowser(this.platformId)) return;

    sessionStorage.setItem(PENDING_MERCADO_PAGO_RETURN_PARAMS_KEY, JSON.stringify(params));
  }

  getStoredMercadoPagoReturnParams(): MercadoPagoReturnParams | null {
    if (!isPlatformBrowser(this.platformId)) return null;

    const raw = sessionStorage.getItem(PENDING_MERCADO_PAGO_RETURN_PARAMS_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as Partial<MercadoPagoReturnParams>;
      const collectionId = parsed.collectionId?.trim();
      const externalReference = parsed.externalReference?.trim();

      if (!collectionId || !externalReference) {
        return null;
      }

      return { collectionId, externalReference };
    } catch {
      return null;
    }
  }

  clearStoredMercadoPagoReturnParams(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    sessionStorage.removeItem(PENDING_MERCADO_PAGO_RETURN_PARAMS_KEY);
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

  getReturnOrderId(queryParamMap?: Pick<ParamMap, 'get'>): number | null {
    const storedOrderId = this.getPendingOrderId();
    if (storedOrderId !== null) {
      return storedOrderId;
    }

    const externalReference = queryParamMap?.get('external_reference')?.trim();
    if (!externalReference) {
      return null;
    }

    const parsed = Number(externalReference);
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
