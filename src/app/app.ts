import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { FooterComponent } from './layout/footer/footer.component';
import { HeaderComponent } from './layout/header/header.component';
import { ToastComponent } from './shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly title = signal('bikes-asaro-front');

  ngOnInit(): void {
    this.redirectMercadoPagoReturnIfNeeded();
  }

  private redirectMercadoPagoReturnIfNeeded(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const url = new URL(window.location.href);
    const paymentStatus = (url.searchParams.get('status') ?? url.searchParams.get('collection_status'))
      ?.toLowerCase()
      .trim();

    if (!paymentStatus) return;

    const targetRoute = this.mapPaymentStatusToRoute(paymentStatus);
    if (!targetRoute) return;

    const currentPath = url.pathname;
    if (currentPath.endsWith(targetRoute)) return;

    this.router.navigate([targetRoute], { replaceUrl: true });
  }

  private mapPaymentStatusToRoute(status: string): string | null {
    if (status === 'approved') {
      return '/checkout/success';
    }

    if (status === 'pending' || status === 'in_process' || status === 'inprocess') {
      return '/checkout/pending';
    }

    if (status === 'rejected' || status === 'cancelled' || status === 'canceled' || status === 'failure') {
      return '/checkout/failure';
    }

    return null;
  }
}
