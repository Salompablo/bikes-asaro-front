import { Component, inject, signal, OnInit } from '@angular/core';
import { CategoryService } from '../../services/category.service';
import { FileService } from '../../services/file.service';
import { CategoryResponse, CategoryRequest } from '../../models/admin.models';
import { ToastService } from '../../../../shared/services/toast.service';
import { FormsModule } from '@angular/forms';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [FormsModule, ConfirmModalComponent],
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

  showDeleteModal = signal(false);
  categoryToDelete = signal<CategoryResponse | null>(null);

  showActivateModal = signal(false);
  categoryToActivate = signal<CategoryResponse | null>(null);

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading.set(true);
    this.categoryService.getAll().subscribe({
      next: (res) => {
        this.categories.set(res.content);
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

  openDeleteModal(cat: CategoryResponse): void {
    this.categoryToDelete.set(cat);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.categoryToDelete.set(null);
  }

  confirmDelete(): void {
    const cat = this.categoryToDelete();
    if (!cat) return;
    this.closeDeleteModal();
    this.categoryService.delete(cat.id).subscribe({
      next: () => {
        this.toast.success('Categoría dada de baja');
        this.loadCategories();
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 409) {
          this.toast.error(
            'No se puede dar de baja: la categoría tiene productos activos. Dá de baja esos productos primero.',
          );
        } else {
          this.toast.error('Error al dar de baja la categoría');
        }
      },
    });
  }

  openActivateModal(cat: CategoryResponse): void {
    this.categoryToActivate.set(cat);
    this.showActivateModal.set(true);
  }

  closeActivateModal(): void {
    this.showActivateModal.set(false);
    this.categoryToActivate.set(null);
  }

  confirmActivate(): void {
    const cat = this.categoryToActivate();
    if (!cat) return;
    this.closeActivateModal();
    this.categoryService.activate(cat.id).subscribe({
      next: () => {
        this.toast.success('Categoría dada de alta');
        this.loadCategories();
      },
      error: () => this.toast.error('Error al dar de alta la categoría'),
    });
  }
}
