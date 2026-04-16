import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PageResponse } from '../../admin/models/admin.models';
import { ReviewRequest, ReviewResponse } from '../models/review.models';
import { API_ENDPOINTS } from '../../../core/http/api-endpoints';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);

  getByProduct(productId: number, page = 0, size = 10): Observable<PageResponse<ReviewResponse>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageResponse<ReviewResponse>>(
      API_ENDPOINTS.REVIEWS.BY_PRODUCT(productId),
      { params },
    );
  }

  create(request: ReviewRequest): Observable<ReviewResponse> {
    return this.http.post<ReviewResponse>(API_ENDPOINTS.REVIEWS.BASE, request);
  }

  update(id: number, request: ReviewRequest): Observable<ReviewResponse> {
    return this.http.patch<ReviewResponse>(API_ENDPOINTS.REVIEWS.BY_ID(id), request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(API_ENDPOINTS.REVIEWS.BY_ID(id));
  }
}
