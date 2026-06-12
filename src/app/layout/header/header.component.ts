import { Component, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CartStateService } from '../../core/services/cart-state.service';
import { AuthService } from '../../features/auth/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent {
  readonly cartState = inject(CartStateService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  isAccountMenuOpen = false;
  isMobileMenuOpen = false;

  @ViewChild('accountMenuWrap') accountMenuWrap?: ElementRef<HTMLElement>;
  @ViewChild('mobileMenuWrap') mobileMenuWrap?: ElementRef<HTMLElement>;

  toggleAccountMenu(): void {
    // On desktop (hover-capable devices) the menu is controlled by hover only.
    if (this.isHoverCapableDevice()) {
      return;
    }

    this.isAccountMenuOpen = !this.isAccountMenuOpen;
    if (this.isAccountMenuOpen) {
      this.isMobileMenuOpen = false;
    }
  }

  openAccountMenu(): void {
    this.isAccountMenuOpen = true;
  }

  closeAccountMenu(): void {
    this.isAccountMenuOpen = false;
  }

  onAccountHoverLeave(): void {
    this.isAccountMenuOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.isAccountMenuOpen) {
      this.isAccountMenuOpen = false;
    }

    if (this.isMobileMenuOpen) {
      this.isMobileMenuOpen = false;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isAccountMenuOpen && !this.isMobileMenuOpen) {
      return;
    }

    const target = event.target as Node | null;
    const accountWrapper = this.accountMenuWrap?.nativeElement;
    const mobileWrapper = this.mobileMenuWrap?.nativeElement;
    if (!target) {
      return;
    }

    if (this.isAccountMenuOpen && accountWrapper && !accountWrapper.contains(target)) {
      this.closeAccountMenu();
    }

    if (this.isMobileMenuOpen && mobileWrapper && !mobileWrapper.contains(target)) {
      this.closeMobileMenu();
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    if (this.isMobileMenuOpen) {
      this.isAccountMenuOpen = false;
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  closeMenus(): void {
    this.isAccountMenuOpen = false;
    this.isMobileMenuOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.cartState.clearCart();
    this.closeMenus();
    this.router.navigate(['/']);
  }

  private isHoverCapableDevice(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;
  }
}
