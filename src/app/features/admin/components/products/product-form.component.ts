import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { FileService } from '../../services/file.service';
import { ProductRequest, CategoryResponse } from '../../models/admin.models';
import { ToastService } from '../../../../shared/services/toast.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './product-form.component.html',
  styles: [
    `
      .admin-label {
        display: block;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #4a4a4a;
        margin-bottom: 0.35rem;
      }
      .admin-input {
        display: block;
        width: 100%;
        padding: 0.55rem 0.75rem;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        color: #0b0b0b;
        background: #fff;
        transition: border-color 160ms ease;
      }
      .admin-input:focus {
        outline: none;
        border-color: #0b0b0b;
      }
    `,
  ],
})
export class ProductFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly fileService = inject(FileService);
  private readonly toast = inject(ToastService);

  categories = signal<CategoryResponse[]>([]);
  isEdit = signal(false);
  saving = signal(false);
  uploading = signal(false);
  draggedImageIndex = signal<number | null>(null);
  dragOverIndex = signal<number | null>(null);
  private productId = 0;

  form: ProductRequest = {
    sku: '',
    name: '',
    description: '',
    price: 0,
    stock: 0,
    categoryId: 0,
    images: [],
    weight: 0,
    length: 0,
    width: 0,
    height: 0,
  };

  ngOnInit(): void {
    this.categoryService.getActive().subscribe({
      next: (res) => this.categories.set(res.content),
      error: () => this.toast.error('Error al cargar categorías'),
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.productId = +id;
      this.productService.getById(this.productId).subscribe({
        next: (p) => {
          this.form = {
            sku: p.sku,
            name: p.name,
            description: p.description,
            price: p.price,
            stock: p.stock,
            categoryId: p.category.id,
            images: [...p.images],
            weight: p.weight,
            length: p.length,
            width: p.width,
            height: p.height,
          };
        },
        error: () => this.toast.error('Error al cargar el producto'),
      });
    }
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.fileService.upload(file).subscribe({
      next: (url) => {
        this.form.images = [...this.form.images, url];
        this.uploading.set(false);
      },
      error: () => {
        this.toast.error('Error al subir la imagen');
        this.uploading.set(false);
      },
    });
  }

  removeImage(index: number): void {
    this.form.images = this.form.images.filter((_, i) => i !== index);
  }

  normalizeImageUrl(url: string): string {
    if (!url) return this.placeholderImage();

    const trimmed = url.trim();
    if (!trimmed) return this.placeholderImage();

    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('/')
    ) {
      return trimmed;
    }

    if (trimmed.startsWith('public/')) {
      return `/${trimmed.replace(/^public\//, '')}`;
    }

    if (trimmed.startsWith('assets/')) {
      return `/${trimmed}`;
    }

    return trimmed;
  }

  onPreviewImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = this.placeholderImage();
  }

  onImageDragStart(index: number): void {
    this.draggedImageIndex.set(index);
  }

  onImageDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    this.dragOverIndex.set(index);
  }

  onImageDrop(index: number): void {
    const from = this.draggedImageIndex();
    if (from === null || from === index) {
      this.clearDragState();
      return;
    }

    const images = [...this.form.images];
    const [moved] = images.splice(from, 1);
    images.splice(index, 0, moved);
    this.form.images = images;
    this.clearDragState();
  }

  onImageDragEnd(): void {
    this.clearDragState();
  }

  private clearDragState(): void {
    this.draggedImageIndex.set(null);
    this.dragOverIndex.set(null);
  }

  private placeholderImage(): string {
    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-family="Arial" font-size="11">Sin imagen</text></svg>';
  }

  onSubmit(): void {
    this.saving.set(true);
    const request$ = this.isEdit()
      ? this.productService.update(this.productId, this.form)
      : this.productService.create(this.form);

    request$.subscribe({
      next: () => {
        this.toast.success(this.isEdit() ? 'Producto actualizado' : 'Producto creado');
        this.router.navigate(['/admin/products']);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 409) {
          this.toast.error('La categoría seleccionada está inactiva. Activá la categoría primero.');
        } else {
          this.toast.error('Error al guardar el producto');
        }
        this.saving.set(false);
      },
    });
  }
}
