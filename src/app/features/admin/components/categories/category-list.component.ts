import { Component, inject, signal, OnInit } from '@angular/core';
import { CategoryService } from '../../services/category.service';
import { FileService } from '../../services/file.service';
import { CategoryResponse, CategoryRequest } from '../../models/admin.models';
import { ToastService } from '../../../../shared/services/toast.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './category-list.component.html',
})
export class CategoryListComponent implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly fileService = inject(FileService);
  private readonly toast = inject(ToastService);

  categories = signal<CategoryResponse[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editingId = signal<number | null>(null);
  saving = signal(false);
  uploading = signal(false);

  formData: CategoryRequest = { name: '', description: '', defaultImageUrl: '' };

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading.set(true);
    this.categoryService.getAll().subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar categorías');
        this.loading.set(false);
      },
    });
  }

  openForm(): void {
    this.formData = { name: '', description: '', defaultImageUrl: '' };
    this.editingId.set(null);
    this.showForm.set(true);
  }

  editCategory(cat: CategoryResponse): void {
    this.formData = {
      name: cat.name,
      description: cat.description,
      defaultImageUrl: cat.defaultImageUrl ?? '',
    };
    this.editingId.set(cat.id);
    this.showForm.set(true);
  }

  onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.fileService.upload(file).subscribe({
      next: (url) => {
        this.formData.defaultImageUrl = url;
        this.uploading.set(false);
      },
      error: () => {
        this.toast.error('Error al subir la imagen');
        this.uploading.set(false);
      },
    });
  }

  removeImage(): void {
    this.formData.defaultImageUrl = '';
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  onSubmit(): void {
    this.saving.set(true);
    const request$ = this.editingId()
      ? this.categoryService.update(this.editingId()!, this.formData)
      : this.categoryService.create(this.formData);

    request$.subscribe({
      next: () => {
        this.toast.success(this.editingId() ? 'Categoría actualizada' : 'Categoría creada');
        this.cancelForm();
        this.loadCategories();
        this.saving.set(false);
      },
      error: () => {
        this.toast.error('Error al guardar la categoría');
        this.saving.set(false);
      },
    });
  }

  deleteCategory(cat: CategoryResponse): void {
    if (!confirm(`¿Dar de baja la categoría "${cat.name}"?`)) return;
    this.categoryService.delete(cat.id).subscribe({
      next: () => {
        this.toast.success('Categoría dada de baja');
        this.loadCategories();
      },
      error: () => this.toast.error('Error al dar de baja la categoría'),
    });
  }
}
