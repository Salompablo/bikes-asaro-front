export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    GOOGLE: '/auth/google',
    VERIFY: '/auth/verify',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    REQUEST_REACTIVATION: '/auth/request-reactivation',
    REACTIVATE: '/auth/reactivate',
  },
  CATEGORIES: {
    BASE: '/categories',
    ACTIVE: '/categories/active',
    BY_ID: (id: number) => `/categories/${id}`,
    ACTIVATE: (id: number) => `/categories/${id}/activate`,
  },
  PRODUCTS: {
    BASE: '/products',
    ADMIN: '/products/admin',
    BY_ID: (id: number) => `/products/${id}`,
    ACTIVATE: (id: number) => `/products/${id}/activate`,
  },
  ADMIN: {
    ORDERS: '/admin/orders',
    ORDER_STATUS: (id: number) => `/admin/orders/${id}/status`,
    USERS: '/admin/users',
  },
  REVIEWS: {
    BASE: '/reviews',
    BY_ID: (id: number) => `/reviews/${id}`,
    BY_PRODUCT: (productId: number) => `/products/${productId}/reviews`,
  },
  FILES: {
    UPLOAD: '/files/upload',
  },
  CHECKOUT: {
    CREATE_PREFERENCE: '/checkout/create-preference',
  },
  ORDERS: {
    BY_ID: (id: number) => `/orders/${id}`,
    MY_ORDERS: '/orders/my-orders',
  },
} as const;
