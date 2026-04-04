import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FileService {
  private readonly http = inject(HttpClient);

  upload(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>('/files/upload', formData).pipe(map((res) => res.url));
  }
}
