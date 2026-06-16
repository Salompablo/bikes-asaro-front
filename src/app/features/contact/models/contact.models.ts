export enum ContactTopic {
  ORDER_ISSUE = 'ORDER_ISSUE',
  PRODUCT_INQUIRY = 'PRODUCT_INQUIRY',
  SHIPPING = 'SHIPPING',
  RETURNS_AND_REFUNDS = 'RETURNS_AND_REFUNDS',
  WARRANTY = 'WARRANTY',
  PAYMENT = 'PAYMENT',
  GENERAL = 'GENERAL',
}

export interface ContactRequest {
  name: string;
  email: string;
  phone?: string;
  orderId?: number;
  topic: ContactTopic;
  message: string;
  captchaToken: string;
}
