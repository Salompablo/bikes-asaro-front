import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReCaptchaV3Service, RecaptchaV3Module } from 'ng-recaptcha';
import { switchMap, take } from 'rxjs';
import { ContactRequest, ContactTopic } from './models/contact.models';
import { ContactService } from './services/contact.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [ReactiveFormsModule, RecaptchaV3Module],
  templateUrl: './contact.component.html',
})
export class ContactComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly contactService = inject(ContactService);
  private readonly recaptchaV3Service = inject(ReCaptchaV3Service);

  readonly contactTopics = ContactTopic;
  readonly loading = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly submitError = signal<string | null>(null);

  readonly topicOptions: ReadonlyArray<{ value: ContactTopic; label: string }> = [
    { value: ContactTopic.ORDER_ISSUE, label: 'Problemas con un pedido' },
    { value: ContactTopic.PRODUCT_INQUIRY, label: 'Consulta sobre un producto' },
    { value: ContactTopic.SHIPPING, label: 'Envios y cotizaciones' },
    { value: ContactTopic.RETURNS_AND_REFUNDS, label: 'Devoluciones y reembolsos' },
    { value: ContactTopic.WARRANTY, label: 'Garantia' },
    { value: ContactTopic.PAYMENT, label: 'Pagos' },
    { value: ContactTopic.GENERAL, label: 'Consulta general' },
  ];

  readonly orderIdTopics = new Set<ContactTopic>([
    ContactTopic.ORDER_ISSUE,
    ContactTopic.SHIPPING,
    ContactTopic.RETURNS_AND_REFUNDS,
  ]);

  readonly form = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    orderId: [{ value: null as number | null, disabled: true }],
    topic: [ContactTopic.GENERAL, [Validators.required]],
    message: ['', [Validators.required, Validators.maxLength(1000)]],
  });

  constructor() {
    this.form.controls.topic.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((topic) => this.syncOrderIdControl(topic ?? ContactTopic.GENERAL));

    this.syncOrderIdControl(this.form.controls.topic.value ?? ContactTopic.GENERAL);
  }

  get isOrderIdVisible(): boolean {
    const topic = this.form.controls.topic.value;
    return this.orderIdTopics.has(topic ?? ContactTopic.GENERAL);
  }

  onSubmit(): void {
    this.successMessage.set(null);
    this.submitError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    this.recaptchaV3Service
      .execute('submit_contact')
      .pipe(
        take(1),
        switchMap((captchaToken) => this.contactService.submit(this.buildPayload(captchaToken))),
      )
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.successMessage.set(
            'Tu consulta fue enviada correctamente. Te responderemos a la brevedad.',
          );
          this.resetForm();
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.submitError.set(this.resolveErrorMessage(error));
        },
      });
  }

  private resetForm(): void {
    this.form.reset({
      name: '',
      email: '',
      phone: '',
      orderId: null,
      topic: ContactTopic.GENERAL,
      message: '',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.syncOrderIdControl(ContactTopic.GENERAL);
  }

  private buildPayload(captchaToken: string): ContactRequest {
    const raw = this.form.getRawValue();
    const topic = raw.topic ?? ContactTopic.GENERAL;
    const trimmedPhone = raw.phone?.trim() ?? '';
    const orderIdValue = raw.orderId;
    const hasOrderId = this.orderIdTopics.has(topic) && orderIdValue != null;

    return {
      name: raw.name?.trim() ?? '',
      email: raw.email?.trim() ?? '',
      phone: trimmedPhone || undefined,
      orderId: hasOrderId ? Number(orderIdValue) : undefined,
      topic,
      message: raw.message?.trim() ?? '',
      captchaToken,
    };
  }

  private syncOrderIdControl(topic: ContactTopic): void {
    const orderIdControl = this.form.controls.orderId;
    if (this.orderIdTopics.has(topic)) {
      orderIdControl.enable({ emitEvent: false });
      orderIdControl.setValidators([Validators.required, Validators.min(1)]);
      orderIdControl.updateValueAndValidity({ emitEvent: false });
      return;
    }

    orderIdControl.setValue(null, { emitEvent: false });
    orderIdControl.clearValidators();
    orderIdControl.disable({ emitEvent: false });
    orderIdControl.updateValueAndValidity({ emitEvent: false });
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && (error.status === 400 || error.status === 409)) {
      return 'Hubo un problema de seguridad o validacion. Intenta nuevamente.';
    }

    return 'No pudimos enviar tu consulta en este momento. Intenta de nuevo en unos minutos.';
  }
}
