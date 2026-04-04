import { Component, inject, signal, OnInit } from '@angular/core';
import { CategoryService } from '../../services/category.service';
import { CategoryResponse, CategoryRequest } from '../../models/admin.models';
import { ToastService } from '../../../../shared/services/toast.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-display tracking-tight text-brand-black">Categorías</h2>
        <button (click)="openForm()"
                class="bg-brand-black text-brand-white px-5 py-2.5 rounded-lg font-display text-sm uppercase tracking-wider hover:bg-brand-dark transition-colors">
          + Nueva categoría
        </button>
      </div>

      @if (showForm()) {
        <div class="bg-brand-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h3 class="text-lg font-display tracking-tight text-brand-black">
            {{ editingId() ? 'Editar categoría' : 'Nueva categoría' }}
          </h3>
          <form (ngSubmit)="onSubmit()" class="space-y-4">
            <div>
              <label class="block text-[0.7rem] font-bold uppercase tracking-widest text-brand-gray mb-1">Nombre</label>
              <input type="text" [(ngModel)]="formData.name" name="name" required
                     class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-black" placeholder="Mountain Bikes" />
            </div>
            <div>
              <label class="block text-[0.7rem] font-bold uppercase tracking-widest text-brand-gray mb-1">Descripción</label>
              <textarea [(ngModel)]="formData.description" name="description" rows="2"
                        class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-black" placeholder="Bicicletas para montaña..."></textarea>
            </div>
            <div class="flex items-center gap-3">
              <button type="submit" [disabled]="saving()"
                      class="bg-brand-black text-brand-white px-5 py-2 rounded-lg font-display text-sm uppercase tracking-wider hover:bg-brand-dark disabled:opacity-50 transition-colors">
                {{ saving() ? 'Guardando...' : (editingId() ? 'Actualizar' : 'Crear') }}
              </button>
              <button type="button" (click)="cancelForm()"
                      class="text-brand-gray hover:text-brand-black text-sm font-display uppercase tracking-wider transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      }

      @if (loading()) {
        <div class="text-center py-12 text-brand-gray">Cargando categorías...</div>
      } @else {
        <div class="bg-brand-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-200">
                <th class="text-left px-4 py-3 font-display uppercase tracking-wider text-xs text-brand-gray">ID</th>
                <th class="text-left px-4 py-3 font-display uppercase tracking-wider text-xs text-brand-gray">Nombre</th>
                <th class="text-left px-4 py-3 font-display uppercase tracking-wider text-xs text-brand-gray">Descripción</th>
                <th class="text-right px-4 py-3 font-display uppercase tracking-wider text-xs text-brand-gray">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (cat of categories(); track cat.id) {
                <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td class="px-4 py-3 text-brand-gray">{{ cat.id }}</td>
                  <td class="px-4 py-3 font-medium text-brand-black">{{ cat.name }}</td>
                  <td class="px-4 py-3 text-brand-gray">{{ cat.description || '—' }}</td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <button (click)="editCategory(cat)"
                              class="text-brand-gray hover:text-brand-black transition-colors text-xs font-display uppercase tracking-wider">
                        Editar
                      </button>
                      <button (click)="deleteCategory(cat)"
                              class="text-red-500 hover:text-red-700 transition-colors text-xs font-display uppercase tracking-wider">
                        Baja
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="text-center py-8 text-brand-gray">No hay categorías registradas.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
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
