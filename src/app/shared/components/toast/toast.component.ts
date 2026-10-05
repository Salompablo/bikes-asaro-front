import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  templateUrl: './toast.component.html',
  styles: [
    `
      .toast {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.85rem 0.9rem 0.85rem 1rem;
        border-radius: 6px;
        background: var(--ink);
        color: #fff;
        font-size: 0.9375rem;
        line-height: 1.45;
        box-shadow: 0 14px 30px rgba(27, 29, 31, 0.28);
        border-left: 5px solid #9aa0a5;
      }
      .toast--success {
        border-left-color: var(--yellow);
      }
      .toast--error {
        border-left-color: #ff6a55;
      }
      .toast__close {
        flex-shrink: 0;
        padding: 0.15rem;
        border-radius: 4px;
        color: #c4c8cb;
      }
      .toast__close:hover {
        color: #fff;
      }
      .toast-enter {
        animation: slideIn 220ms cubic-bezier(0.19, 1, 0.22, 1);
      }
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(0.75rem);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class ToastComponent {
  protected readonly toastService = inject(ToastService);
}
