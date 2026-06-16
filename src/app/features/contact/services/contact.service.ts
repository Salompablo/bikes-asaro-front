import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/http/api-endpoints';
import { ContactRequest } from '../models/contact.models';

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);

  submit(request: ContactRequest): Observable<void> {
    return this.http.post<void>(API_ENDPOINTS.CONTACT.BASE, request);
  }
}
