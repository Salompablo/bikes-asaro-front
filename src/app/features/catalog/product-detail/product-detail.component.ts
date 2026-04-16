import { Component, computed, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, EMPTY } from 'rxjs';
import { ProductService } from '../../admin/services/product.service';
import { ProductResponse } from '../../admin/models/admin.models';
import { CartStateService } from '../../../core/services/cart-state.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ReviewService } from '../services/review.service';
import { ReviewResponse } from '../models/review.models';
import { AuthService } from '../../auth/services/auth.service';
import { StarRatingComponent } from '../../../shared/components/star-rating/star-rating.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    RouterLink,
    ReactiveFormsModule,
    StarRatingComponent,
    ConfirmModalComponent,
  ],
  templateUrl: './product-detail.component.html',
})
export class ProductDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  private readonly cartState = inject(CartStateService);
  private readonly toast = inject(ToastService);
  private readonly reviewService = inject(ReviewService);
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);

  @ViewChild('reviewFormEl') reviewFormEl?: ElementRef<HTMLElement>;

  product = signal<ProductResponse | null>(null);
  loading = signal(true);
  quantity = signal(1);
  currentImageIndex = signal(0);
  slideDirection = signal<'left' | 'right' | null>(null);

  // Reviews
  reviews = signal<ReviewResponse[]>([]);
  reviewPage = signal(0);
  reviewTotalPages = signal(0);
  reviewsLoading = signal(false);
  submittingReview = signal(false);
  editingReviewId = signal<number | null>(null);
  formRating = signal(0);
  showDeleteModal = signal(false);
  deletingReviewId = signal<number | null>(null);

  reviewForm = this.fb.group({
    comment: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
  });

  images = computed(() => {
    const p = this.product();
    if (!p) return [];
    const valid = p.images.filter((img) => !!img?.trim());
    return valid.length > 0 ? valid : [p.category.defaultImageUrl];
  });

  currentImage = computed(() => this.images()[this.currentImageIndex()]);

  isOutOfStock = computed(() => {
    const p = this.product();
    return p ? p.stock <= 0 : true;
  });

  isEditMode = computed(() => this.editingReviewId() !== null);

  private productId!: number;

  ngOnInit(): void {
    this.productId = Number(this.route.snapshot.paramMap.get('id'));
    this.productService.getById(this.productId).subscribe({
      next: (product) => {
        this.product.set(product);
        this.loading.set(false);
        this.loadReviews();
      },
      error: () => {
        this.toast.error('Error al cargar el producto');
        this.loading.set(false);
      },
    });
  }

  loadReviews(): void {
    this.reviewsLoading.set(true);
    this.reviewService.getByProduct(this.productId, this.reviewPage()).subscribe({
      next: (res) => {
        this.reviews.update((prev) =>
          this.reviewPage() === 0 ? res.content : [...prev, ...res.content],
        );
        this.reviewTotalPages.set(res.page.totalPages);
        this.reviewsLoading.set(false);
      },
      error: () => {
        this.reviewsLoading.set(false);
      },
    });
  }

  loadMoreReviews(): void {
    this.reviewPage.update((p) => p + 1);
    this.loadReviews();
  }

  setFormRating(rating: number): void {
    this.formRating.set(rating);
  }

  submitReview(): void {
    if (this.reviewForm.invalid || this.formRating() === 0) {
      if (this.formRating() === 0) {
        this.toast.error('Seleccioná una valoración');
      }
      this.reviewForm.markAllAsTouched();
      return;
    }

    this.submittingReview.set(true);
    const payload = {
      rating: this.formRating(),
      comment: this.reviewForm.value.comment!,
      productId: this.productId,
    };

    const request$ = this.isEditMode()
      ? this.reviewService.update(this.editingReviewId()!, payload)
      : this.reviewService.create(payload);

    request$
      .pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 409) {
            this.toast.info('Ya habías reseñado este producto. Podés editar tu reseña actual.');
            const existingReview = this.reviews().find(
              (r) => r.comment === payload.comment || r.userFirstName !== undefined,
            );
            if (existingReview) {
              this.editingReviewId.set(existingReview.id);
            }
          } else {
            this.toast.error('Error al enviar la reseña');
          }
          this.submittingReview.set(false);
          return EMPTY;
        }),
      )
      .subscribe((review) => {
        if (this.isEditMode()) {
          this.reviews.update((list) => list.map((r) => (r.id === review.id ? review : r)));
          this.toast.success('Reseña actualizada');
        } else {
          this.reviews.update((list) => [review, ...list]);
          this.product.update((p) =>
            p
              ? {
                  ...p,
                  reviewCount: p.reviewCount + 1,
                  averageRating:
                    (p.averageRating * p.reviewCount + review.rating) / (p.reviewCount + 1),
                }
              : p,
          );
          this.toast.success('Reseña publicada');
        }
        this.editingReviewId.set(null);
        this.formRating.set(0);
        this.reviewForm.reset();
        this.submittingReview.set(false);
      });
  }

  cancelEdit(): void {
    this.editingReviewId.set(null);
    this.formRating.set(0);
    this.reviewForm.reset();
  }

  startEdit(review: ReviewResponse): void {
    this.editingReviewId.set(review.id);
    this.formRating.set(review.rating);
    this.reviewForm.patchValue({ comment: review.comment });
    setTimeout(() => {
      this.reviewFormEl?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  isOwnReview(review: ReviewResponse): boolean {
    return this.authService.userEmail() === review.userEmail;
  }

  confirmDeleteReview(reviewId: number): void {
    this.deletingReviewId.set(reviewId);
    this.showDeleteModal.set(true);
  }

  cancelDeleteReview(): void {
    this.deletingReviewId.set(null);
    this.showDeleteModal.set(false);
  }

  deleteReview(): void {
    const id = this.deletingReviewId();
    if (!id) return;

    const deletedReview = this.reviews().find((r) => r.id === id);
    this.showDeleteModal.set(false);

    this.reviewService.delete(id).subscribe({
      next: () => {
        this.reviews.update((list) => list.filter((r) => r.id !== id));
        if (deletedReview) {
          this.product.update((p) => {
            if (!p) return p;
            const newCount = p.reviewCount - 1;
            return {
              ...p,
              reviewCount: newCount,
              averageRating:
                newCount > 0
                  ? (p.averageRating * p.reviewCount - deletedReview.rating) / newCount
                  : 0,
            };
          });
        }
        this.deletingReviewId.set(null);
        this.toast.success('Reseña eliminada');
      },
      error: () => {
        this.deletingReviewId.set(null);
        this.toast.error('Error al eliminar la reseña');
      },
    });
  }

  prevImage(): void {
    this.slideDirection.set('right');
    this.currentImageIndex.update((i) => (i > 0 ? i - 1 : this.images().length - 1));
  }

  nextImage(): void {
    this.slideDirection.set('left');
    this.currentImageIndex.update((i) => (i < this.images().length - 1 ? i + 1 : 0));
  }

  goToImage(index: number): void {
    this.slideDirection.set(index > this.currentImageIndex() ? 'left' : 'right');
    this.currentImageIndex.set(index);
  }

  decrementQuantity(): void {
    this.quantity.update((q) => (q > 1 ? q - 1 : 1));
  }

  incrementQuantity(): void {
    const max = this.product()?.stock ?? 1;
    this.quantity.update((q) => (q < max ? q + 1 : q));
  }

  addToCart(): void {
    const p = this.product();
    if (!p || this.isOutOfStock()) return;

    this.cartState.addItem({
      productId: p.id,
      name: p.name,
      price: p.price,
      image: this.images()[0],
      quantity: this.quantity(),
    });
    this.toast.success(`${p.name} agregado al carrito`);
  }

  onImageError(event: Event): void {
    const p = this.product();
    if (!p) return;
    const img = event.target as HTMLImageElement;
    const fallback = p.category.defaultImageUrl;
    if (img.src !== fallback) {
      img.src = fallback;
    }
  }
}
