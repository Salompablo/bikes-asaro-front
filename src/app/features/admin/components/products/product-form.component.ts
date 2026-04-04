import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { FileService } from '../../services/file.service';
import { ProductRequest, CategoryResponse } from '../../models/admin.models';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="max-w-3xl space-y-6">
      <div class="flex items-center gap-4">
        <a routerLink="/admin/products" class="text-brand-gray hover:text-brand-black transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </a>
        <h2 class="text-2xl font-display tracking-tight text-brand-black">
          {{ isEdit() ? 'Editar producto' : 'Nuevo producto' }}
        </h2>
      </div>

      <form (ngSubmit)="onSubmit()" class="bg-brand-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label class="admin-label">SKU</label>
            <input type="text" [(ngModel)]="form.sku" name="sku" required class="admin-input" placeholder="MTB-TREK-M5" />
          </div>
          <div>
            <label class="admin-label">Nombre</label>
            <input type="text" [(ngModel)]="form.name" name="name" required class="admin-input" placeholder="Trek Marlin 5" />
          </div>
        </div>

        <div>
          <label class="admin-label">Descripción</label>
          <textarea [(ngModel)]="form.description" name="description" rows="3" class="admin-input" placeholder="Descripción del producto..."></textarea>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label class="admin-label">Precio</label>
            <input type="number" [(ngModel)]="form.price" name="price" required min="0" step="0.01" class="admin-input" />
          </div>
          <div>
            <label class="admin-label">Stock</label>
            <input type="number" [(ngModel)]="form.stock" name="stock" required min="0" class="admin-input" />
          </div>
          <div>
            <label class="admin-label">Categoría</label>
            <select [(ngModel)]="form.categoryId" name="categoryId" required class="admin-input">
              <option [ngValue]="0" disabled>Seleccionar...</option>
              @for (cat of categories(); track cat.id) {
                <option [ngValue]="cat.id">{{ cat.name }}</option>
              }
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-5">
          <div>
            <label class="admin-label">Peso (kg)</label>
            <input type="number" [(ngModel)]="form.weight" name="weight" required min="0" step="0.1" class="admin-input" />
          </div>
          <div>
            <label class="admin-label">Largo (cm)</label>
            <input type="number" [(ngModel)]="form.length" name="length" required min="0" step="0.1" class="admin-input" />
          </div>
          <div>
            <label class="admin-label">Ancho (cm)</label>
            <input type="number" [(ngModel)]="form.width" name="width" required min="0" step="0.1" class="admin-input" />
          </div>
          <div>
            <label class="admin-label">Alto (cm)</label>
            <input type="number" [(ngModel)]="form.height" name="height" required min="0" step="0.1" class="admin-input" />
          </div>
        </div>

        <!-- Images -->
        <div class="space-y-3">
          <label class="admin-label">Imágenes</label>

          @if (form.images.length > 0) {
            <div class="flex flex-wrap gap-3">
              @for (img of form.images; track img; let i = $index) {
                <div class="relative group w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
                  <img [src]="img" alt="Producto" class="w-full h-full object-cover" />
                  <button type="button" (click)="removeImage(i)"
                          class="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold">
                    ✕
                  </button>
                </div>
              }
            </div>
          }

          <div class="flex items-center gap-3">
            <label class="cursor-pointer bg-gray-100 hover:bg-gray-200 text-brand-gray px-4 py-2 rounded-lg text-sm font-display uppercase tracking-wider transition-colors">
              {{ uploading() ? 'Subiendo...' : 'Subir imagen' }}
              <input type="file" accept="image/*" class="hidden" (change)="onFileSelected($event)" [disabled]="uploading()" />
            </label>
            @if (uploading()) {
              <span class="text-sm text-brand-gray">Subiendo archivo...</span>
            }
          </div>
        </div>

        <div class="flex items-center gap-3 pt-2">
          <button type="submit" [disabled]="saving()"
                  class="bg-brand-black text-brand-white px-6 py-2.5 rounded-lg font-display text-sm uppercase tracking-wider hover:bg-brand-dark disabled:opacity-50 transition-colors">
            {{ saving() ? 'Guardando...' : (isEdit() ? 'Actualizar' : 'Crear producto') }}
          </button>
          <a routerLink="/admin/products" class="text-brand-gray hover:text-brand-black text-sm font-display uppercase tracking-wider transition-colors">
            Cancelar
          </a>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .admin-label {
      display: block;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #4A4A4A;
      margin-bottom: 0.35rem;
    }
    .admin-input {
      display: block;
      width: 100%;
      padding: 0.55rem 0.75rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      color: #0B0B0B;
      background: #fff;
      transition: border-color 160ms ease;
    }
    .admin-input:focus {
      outline: none;
      border-color: #0B0B0B;
    }
  `],
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
    this.categoryService.getAll().subscribe({
      next: (cats) => this.categories.set(cats),
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
      error: () => {
        this.toast.error('Error al guardar el producto');
        this.saving.set(false);
      },
    });
  }
}
