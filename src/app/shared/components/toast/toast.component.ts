import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div
      class="fixed top-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-3 toast-enter"
          [class.bg-green-600]="toast.type === 'success'"
          [class.bg-red-600]="toast.type === 'error'"
          [class.bg-brand-dark]="toast.type === 'info'"
          [class.border]="toast.type === 'info'"
          [class.border-brand-gray]="toast.type === 'info'"
          [class.text-white]="toast.type !== 'info'"
          [class.text-brand-silver]="toast.type === 'info'"
          role="alert"
        >
          <span class="flex-1">{{ toast.message }}</span>
          <button
            type="button"
            class="opacity-70 hover:opacity-100 text-lg leading-none shrink-0"
            (click)="toastService.dismiss(toast.id)"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      }
    </div>
  `,
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
