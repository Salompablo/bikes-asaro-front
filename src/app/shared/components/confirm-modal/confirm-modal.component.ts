import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  templateUrl: './confirm-modal.component.html',
  styles: [
    `
      .animate-modal-in {
        animation: modalIn 180ms cubic-bezier(0.19, 1, 0.22, 1);
      }
      .modal-top-danger {
        border-top: 4px solid var(--red);
      }
      .modal-top-confirm {
        border-top: 4px solid var(--yellow);
      }
      @keyframes modalIn {
        from {
          opacity: 0;
          transform: translateY(12px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class ConfirmModalComponent {
  visible = input.required<boolean>();
  title = input('Confirmar acción');
  message = input('¿Estás seguro de que querés continuar?');
  confirmText = input('Confirmar');
  variant = input<'destructive' | 'confirm'>('destructive');

  confirm = output<void>();
  cancel = output<void>();

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
