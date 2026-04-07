import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  templateUrl: './confirm-modal.component.html',
  styles: [
    `
      .animate-modal-in {
        animation: modalIn 150ms ease-out;
      }
      @keyframes modalIn {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
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
