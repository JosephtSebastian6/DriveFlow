import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminUsuariosService, UsuarioResumen } from './admin-usuarios.service';
import { AdminUsuariosActionsService } from './dashboard-admin-usuarios.actions';

@Component({
  selector: 'app-dashboard-admin-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-admin-usuarios.html',
  styleUrls: ['./dashboard-admin-usuarios.css']
})
export class DashboardAdminUsuariosComponent implements OnInit {
  tipoUsuario = (localStorage.getItem('tipo_usuario') || '').toLowerCase();
  rolFiltro: string = '';
  usuarios: UsuarioResumen[] = [];
  // Derivados para búsqueda/paginación
  filteredUsuarios: UsuarioResumen[] = [];
  pagedUsuarios: UsuarioResumen[] = [];

  rolesDisponibles = ['cliente','funcionario','empresa','administrador'];

  // Estado UI
  loadingRolUser: string | null = null;
  loadingBloqueoUser: string | null = null;
  toastMessage: string | null = null;
  toastType: 'success' | 'error' = 'success';

  // Búsqueda y paginación
  searchText: string = '';
  pageIndex: number = 1; // 1-based
  pageSize: number = 10;
  pageSizeOptions = [5, 10, 20, 50];
  totalItems: number = 0;

  get maxPage(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  // Ordenamiento
  sortKey: 'username' | 'nombre' | 'email' | 'telefono' | 'rol' = 'username';
  sortDir: 'asc' | 'desc' = 'asc';

  constructor(
    private router: Router,
    private adminService: AdminUsuariosService,
    private actions: AdminUsuariosActionsService,
  ) {}

  ngOnInit(): void {
    // Seguridad mínima: si no es admin, redirigimos.
    if (this.tipoUsuario !== 'administrador') {
      this.router.navigateByUrl('/dashboard');
    }
    this.cargarUsuarios();
  }

  cargarUsuarios() {
    const rol = this.rolFiltro?.trim() || undefined;
    this.adminService.getUsuarios(rol).subscribe({
      next: (data) => {
        this.usuarios = data;
        this.pageIndex = 1;
        this.computeView();
      },
      error: (err) => console.error('Error cargando usuarios', err),
    });
  }

  onSearchChange() {
    this.pageIndex = 1;
    this.computeView();
  }

  roleClass(rol: string | undefined | null): string {
    const r = (rol || '').toLowerCase();
    if (r === 'administrador') return 'is-admin';
    if (r === 'empresa') return 'is-empresa';
    if (r === 'funcionario') return 'is-funcionario';
    return 'is-cliente';
  }

  onPageSizeChange(size: number) {
    this.pageSize = Number(size) || 10;
    this.pageIndex = 1;
    this.computeView();
  }

  prevPage() {
    if (this.pageIndex > 1) {
      this.pageIndex--;
      this.computeView();
    }
  }

  nextPage() {
    if (this.pageIndex < this.maxPage) {
      this.pageIndex++;
      this.computeView();
    }
  }

  private computeView() {
    const q = this.searchText.trim().toLowerCase();
    this.filteredUsuarios = !q
      ? [...this.usuarios]
      : this.usuarios.filter(u =>
          (u.username || '').toLowerCase().includes(q) ||
          (`${u.nombres} ${u.apellidos}` || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.telefono || '').toLowerCase().includes(q) ||
          (u.tipo_usuario || '').toLowerCase().includes(q)
        );

    // Ordenamiento
    const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });
    const getValue = (u: UsuarioResumen) => {
      switch (this.sortKey) {
        case 'nombre': return `${u.nombres || ''} ${u.apellidos || ''}`.trim();
        case 'email': return u.email || '';
        case 'telefono': return u.telefono || '';
        case 'rol': return u.tipo_usuario || '';
        default: return u.username || '';
      }
    };
    this.filteredUsuarios.sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      const cmp = collator.compare(va, vb);
      return this.sortDir === 'asc' ? cmp : -cmp;
    });

    this.totalItems = this.filteredUsuarios.length;
    const start = (this.pageIndex - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pagedUsuarios = this.filteredUsuarios.slice(start, end);
  }

  setSort(key: 'username' | 'nombre' | 'email' | 'telefono' | 'rol') {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    this.computeView();
  }

  onChangeRol(u: UsuarioResumen, nuevoRol: string) {
    if (!nuevoRol || nuevoRol === u.tipo_usuario) return;
    this.loadingRolUser = u.username;
    this.actions.cambiarRol(u.username, nuevoRol).subscribe({
      next: () => {
        u.tipo_usuario = nuevoRol;
        this.showToast(`Rol actualizado a "${nuevoRol}" para ${u.username}`, 'success');
      },
      error: (err) => {
        console.error('Error cambiando rol', err);
        this.showToast('Error al cambiar el rol', 'error');
      },
      complete: () => { this.loadingRolUser = null; }
    });
  }

  onToggleBloqueo(u: UsuarioResumen, checked: boolean) {
    // checked = true => email_verified = true => no bloqueado
    const bloqueado = !checked;
    this.loadingBloqueoUser = u.username;
    this.actions.setBloqueo(u.username, bloqueado).subscribe({
      next: () => {
        // Si bloqueado => email_verified false
        u.email_verified = !bloqueado;
        this.showToast(bloqueado ? `Usuario bloqueado: ${u.username}` : `Usuario desbloqueado: ${u.username}`, 'success');
      },
      error: (err) => {
        console.error('Error cambiando estado de bloqueo', err);
        // Revertimos UI
        u.email_verified = !checked;
        this.showToast('Error al cambiar el estado de bloqueo', 'error');
      },
      complete: () => { this.loadingBloqueoUser = null; }
    });
  }

  private showToast(msg: string, type: 'success' | 'error') {
    this.toastMessage = msg;
    this.toastType = type;
    setTimeout(() => { this.toastMessage = null; }, 2500);
  }
}
