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
}

// ── Response DTOs ──

export interface ProductResponse {
  id: number;
  sku: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: CategoryResponse;
  images: string[];
  isActive: boolean;
  weight: number;
  length: number;
  width: number;
  height: number;
}

export interface CategoryResponse {
  id: number;
  name: string;
  description: string;
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
}

export interface OrderResponse {
  id: number;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItemResponse[];
  shippingAddress: string;
  zipCode: string;
  shippingCost: number;
  trackingNumber: string;
}

export interface OrderItemResponse {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
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

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
