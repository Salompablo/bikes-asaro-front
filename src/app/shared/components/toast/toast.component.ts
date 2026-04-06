import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  templateUrl: './toast.component.html',
  styles: [
    `
      .toast-enter {
        animation: slideIn 200ms ease-out;
      }
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(1rem);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
    `,
  ],
})
export class ToastComponent {
  protected readonly toastService = inject(ToastService);
}
