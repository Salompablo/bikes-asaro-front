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
    BY_ID: (id: number) => `/categories/${id}`,
  },
  PRODUCTS: {
    BASE: '/products',
    BY_ID: (id: number) => `/products/${id}`,
  },
  ADMIN: {
    ORDERS: '/admin/orders',
    ORDER_STATUS: (id: number) => `/admin/orders/${id}/status`,
    USERS: '/admin/users',
  },
  FILES: {
    UPLOAD: '/files/upload',
  },
} as const;
