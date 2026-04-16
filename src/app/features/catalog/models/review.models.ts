export interface ReviewRequest {
  rating: number;
  comment: string;
  productId: number;
}

export interface ReviewResponse {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
}
