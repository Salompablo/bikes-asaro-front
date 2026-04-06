import { Component, inject, signal, OnInit } from '@angular/core';
import { CategoryService } from '../../services/category.service';
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
  private readonly toast = inject(ToastService);

  categories = signal<CategoryResponse[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editingId = signal<number | null>(null);
  saving = signal(false);

  formData: CategoryRequest = { name: '', description: '' };

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
    this.formData = { name: '', description: '' };
    this.editingId.set(null);
    this.showForm.set(true);
  }

  editCategory(cat: CategoryResponse): void {
    this.formData = { name: cat.name, description: cat.description };
    this.editingId.set(cat.id);
    this.showForm.set(true);
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
