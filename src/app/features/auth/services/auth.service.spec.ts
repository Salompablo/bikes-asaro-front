import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    localStorage.clear();
  });

  it('should persist and clear the pending verification email', () => {
    service.savePendingVerificationEmail('user@mail.com');

    expect(service.getPendingVerificationEmail()).toBe('user@mail.com');

    service.clearPendingVerificationEmail();

    expect(service.getPendingVerificationEmail()).toBeNull();
  });
});
