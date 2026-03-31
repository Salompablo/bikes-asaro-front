import { Component, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartStateService } from '../../core/services/cart-state.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent {
  readonly cartState = inject(CartStateService);
  isSearchOpen = false;
  isAccountMenuOpen = false;

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  openSearch(): void {
    this.isSearchOpen = true;
    this.isAccountMenuOpen = false;
    setTimeout(() => this.searchInput?.nativeElement.focus(), 120);
  }

  closeSearch(): void {
    this.isSearchOpen = false;
  }

  toggleAccountMenu(): void {
    this.isAccountMenuOpen = !this.isAccountMenuOpen;
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.isSearchOpen) {
      this.closeSearch();
    }
    if (this.isAccountMenuOpen) {
      this.isAccountMenuOpen = false;
    }
  }
}
