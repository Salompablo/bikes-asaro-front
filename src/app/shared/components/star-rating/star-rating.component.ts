import { Component, input, output, signal, computed } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  template: `
    <div
      class="inline-flex items-center gap-0.5"
      [attr.role]="readonly() ? 'img' : 'group'"
      [attr.aria-label]="readonly() ? 'Puntaje: ' + rating() + ' de ' + maxRating() : 'Elegí un puntaje'"
    >
      @for (star of stars(); track $index) {
        @if (readonly()) {
          <svg
            class="w-5 h-5 transition-colors duration-150"
            [class]="star <= displayRating() ? 'text-brand-accent' : 'text-brand-silver'"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
        } @else {
          <button
            type="button"
            class="p-0.5 rounded-sm"
            [attr.aria-label]="star + (star === 1 ? ' estrella' : ' estrellas')"
            [attr.aria-pressed]="star === rating()"
            (mouseenter)="onHover(star)"
            (mouseleave)="onLeave()"
            (focus)="onHover(star)"
            (blur)="onLeave()"
            (click)="onSelect(star)"
          >
            <svg
              class="w-7 h-7 transition-colors duration-150"
              [class]="star <= displayRating() ? 'text-brand-accent' : 'text-brand-silver'"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="#1b1d1f"
              stroke-width="1"
              aria-hidden="true"
            >
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              />
            </svg>
          </button>
        }
      }
    </div>
  `,
})
export class StarRatingComponent {
  readonly rating = input(0);
  readonly maxRating = input(5);
  readonly readonly = input(true);

  readonly ratingChange = output<number>();

  protected hoveredStar = signal(0);

  protected stars = computed(() => Array.from({ length: this.maxRating() }, (_, i) => i + 1));

  protected displayRating = computed(() =>
    this.hoveredStar() > 0 ? this.hoveredStar() : this.rating(),
  );

  onHover(star: number): void {
    if (!this.readonly()) this.hoveredStar.set(star);
  }

  onLeave(): void {
    this.hoveredStar.set(0);
  }

  onSelect(star: number): void {
    if (!this.readonly()) this.ratingChange.emit(star);
  }
}
