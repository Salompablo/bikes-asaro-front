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

  @ViewChild('accountMenuWrap') accountMenuWrap?: ElementRef<HTMLElement>;

  toggleAccountMenu(): void {
    // On desktop (hover-capable devices) the menu is controlled by hover only.
    if (this.isHoverCapableDevice()) {
      return;
    }

    this.isAccountMenuOpen = !this.isAccountMenuOpen;
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
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isAccountMenuOpen) {
      return;
    }

    const target = event.target as Node | null;
    const wrapper = this.accountMenuWrap?.nativeElement;
    if (!target || !wrapper) {
      return;
    }

    if (!wrapper.contains(target)) {
      this.closeAccountMenu();
    }
  }

  logout(): void {
    this.authService.logout();
    this.cartState.clearCart();
    this.isAccountMenuOpen = false;
    this.router.navigate(['/']);
  }

  private isHoverCapableDevice(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;
  }
}
