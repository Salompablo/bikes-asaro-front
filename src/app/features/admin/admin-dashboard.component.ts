import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-dashboard.component.html',
  styles: [
    `
      .nav-pill {
        transition:
          background-color 180ms ease,
          color 180ms ease;
      }
    `,
  ],
})
export class AdminDashboardComponent {}
