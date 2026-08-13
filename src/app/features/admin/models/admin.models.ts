// ── Request DTOs ──

export interface ProductRequest {
  sku: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: number;
  images: string[];
  weight: number;
  length: number;
  width: number;
  height: number;
}

export interface CategoryRequest {
  name: string;
  description: string;
  defaultImageUrl: string;
}

// ── Response DTOs ──

export interface ProductResponse {
  id: number;
  sku: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  availableToReserveNow?: number;
  category: CategoryResponse;
  images: string[];
  isActive: boolean;
  weight: number;
  length: number;
  width: number;
  height: number;
  averageRating: number;
  reviewCount: number;
}

export interface CategoryResponse {
  id: number;
  name: string;
  description: string;
  defaultImageUrl: string;
  isActive: boolean;
}

export interface UserResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  provider: string;
  defaultPhone?: string | null;
}

export interface OrderResponse {
  id: number;
  status: string;
  paymentStatus?: string | null;
  flowStatus?: string | null;
  subtotalAmount?: number | null;
  requiresShippingQuote?: boolean;
  payableNow?: boolean;
  checkoutUrl?: string | null;
  quoteExpiresAt?: string | null;
  preferenceId?: string | null;
  initPoint?: string | null;
  totalAmount: number;
  createdAt: string;
  items: OrderItemResponse[];
  deliveryMethod: string;
  shippingAddress: string | null;
  zipCode: string | null;
  shippingCost: number | null;
  trackingNumber: string | null;
  contactPhone: string | null;
}

export interface AdminOrderDetailResponse extends OrderResponse {
  subtotalAmount: number | null;
  customerEmail: string;
}

export interface PublishShippingQuoteRequest {
  shippingCost: number;
}

export interface CheckoutResponse {
  requiresShippingQuote: boolean;
  payableNow: boolean;
  flowStatus: string;
  checkoutUrl?: string | null;
  quoteExpiresAt?: string | null;
  initPoint: string | null;
  preferenceId: string | null;
  orderId: number;
}

export interface OrderItemResponse {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
}

export interface PageResponse<T> {
  content: T[];
  page: PageMetaData;
}

export interface PageMetaData {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

export type OrderStatus =
  | 'INITIATED'
  | 'QUOTE_REQUESTED'
  | 'QUOTE_READY_PAYMENT_PENDING'
  | 'PENDING'
  | 'PAID'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';
