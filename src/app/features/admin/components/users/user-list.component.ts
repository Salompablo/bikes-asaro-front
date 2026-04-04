import { Component, inject, signal, OnInit } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { UserResponse } from '../../models/admin.models';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  template: `
    <div class="space-y-6">
      <h2 class="text-2xl font-display tracking-tight text-brand-black">Usuarios</h2>

      @if (loading()) {
        <div class="text-center py-12 text-brand-gray">Cargando usuarios...</div>
      } @else {
        <div class="bg-brand-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-200">
                  <th class="text-left px-4 py-3 font-display uppercase tracking-wider text-xs text-brand-gray">ID</th>
                  <th class="text-left px-4 py-3 font-display uppercase tracking-wider text-xs text-brand-gray">Email</th>
                  <th class="text-left px-4 py-3 font-display uppercase tracking-wider text-xs text-brand-gray">Nombre</th>
                  <th class="text-center px-4 py-3 font-display uppercase tracking-wider text-xs text-brand-gray">Rol</th>
                  <th class="text-center px-4 py-3 font-display uppercase tracking-wider text-xs text-brand-gray">Proveedor</th>
                  <th class="text-center px-4 py-3 font-display uppercase tracking-wider text-xs text-brand-gray">Email verificado</th>
                  <th class="text-center px-4 py-3 font-display uppercase tracking-wider text-xs text-brand-gray">Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (user of users(); track user.id) {
                  <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td class="px-4 py-3 text-brand-gray">{{ user.id }}</td>
                    <td class="px-4 py-3 font-medium text-brand-black">{{ user.email }}</td>
                    <td class="px-4 py-3 text-brand-gray">{{ user.firstName }} {{ user.lastName }}</td>
                    <td class="px-4 py-3 text-center">
                      <span class="inline-block px-2 py-0.5 rounded-full text-xs font-bold uppercase"
                            [class]="user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'">
                        {{ user.role === 'ADMIN' ? 'Administrador' : 'Cliente' }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-center text-xs text-brand-gray">{{ user.provider === 'LOCAL' ? 'Local' : 'Google' }}</td>
                    <td class="px-4 py-3 text-center">
                      <span class="inline-block w-2 h-2 rounded-full" [class]="user.isEmailVerified ? 'bg-green-500' : 'bg-red-400'"></span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span class="inline-block px-2 py-0.5 rounded-full text-xs font-bold uppercase"
                            [class]="user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                        {{ user.isActive ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="text-center py-8 text-brand-gray">No hay usuarios registrados.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        @if (totalPages() > 1) {
          <div class="flex items-center justify-center gap-2 pt-4">
            <button (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() === 0"
                    class="px-3 py-1.5 rounded-lg text-sm border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition-colors">
              ← Anterior
            </button>
            <span class="text-sm text-brand-gray px-3">
              Página {{ currentPage() + 1 }} de {{ totalPages() }}
            </span>
            <button (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() + 1 >= totalPages()"
                    class="px-3 py-1.5 rounded-lg text-sm border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition-colors">
              Siguiente →
            </button>
          </div>
        }
      }
    </div>
  `,
})
export class UserListComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  users = signal<UserResponse[]>([]);
  loading = signal(true);
  currentPage = signal(0);
  totalPages = signal(0);

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.adminService.getUsers(this.currentPage()).subscribe({
      next: (res) => {
        this.users.set(res.content);
        this.totalPages.set(res.page.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar usuarios');
        this.loading.set(false);
      },
    });
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadUsers();
  }
}
