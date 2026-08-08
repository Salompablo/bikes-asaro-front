import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
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
