
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardEmpresaClientesService, Cliente } from './dashboard-empresa-clientes.service';

@Component({
  selector: 'app-dashboard-empresa-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-empresa-clientes.html',
  styleUrls: ['./dashboard-empresa-clientes.css']
})
export class DashboardEmpresaClientesComponent implements OnInit {
  clientes: Cliente[] = [];
  loading = true;
  error: string | null = null;
  debugInfo: { total: number; sample?: any } = { total: 0 };
  filtroTipo: 'clientes' | 'funcionarios' | 'pime' | 'todos' = 'clientes';
  searchTerm: string = '';

  constructor(private clientesService: DashboardEmpresaClientesService) {}

  ngOnInit() {
    this.clientesService.getClientes().subscribe({
      next: (data) => {
        console.log('[EmpresaClientes] respuesta', data);
        this.clientes = Array.isArray(data) ? data : [];
        this.debugInfo = { total: this.clientes.length, sample: this.clientes[0] };
        this.loading = false;
      },
      error: (_err) => {
        this.error = 'Error al cargar los clientes';
        this.loading = false;
      }
    });
  }

  private startOfToday(): Date {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate(), 0, 0, 0, 0);
  }

  private endOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  }

  private addOneYear(d: Date): Date {
    // Añade un año manejando fin de mes (p. ej., 29/02 → 28/02 si no hay 29)
    const y = d.getFullYear() + 1;
    const m = d.getMonth();
    const day = d.getDate();
    const candidate = new Date(y, m, day);
    // Si el mes cambió por overflow (p. ej., 31/09 -> 01/10), retrocede al último día válido
    if (candidate.getMonth() !== m) {
      // día 0 del mes siguiente = último día del mes deseado
      return new Date(y, m + 1, 0);
    }
    return candidate;
  }

  private daysUntilDoc(dateInput: any): number | null {
    const d = this.parseDateFlexible(dateInput);
    if (!d) return null;
    // Interpretar el valor ingresado como FECHA DE EMISIÓN y calcular el VENCIMIENTO a +1 año
    const expiry = this.addOneYear(d);
    const target = this.endOfDay(expiry);
    const today0 = this.startOfToday();
    const diffMs = target.getTime() - today0.getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.ceil(diffMs / oneDay);
  }

  private parseDateFlexible(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value.getTime())) return value;
    const s = value.toString().trim();
    // ISO 'YYYY-MM-DD'
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    if (iso.test(s)) {
      const d = new Date(s + 'T00:00:00');
      return isNaN(d.getTime()) ? null : d;
    }
    // 'DD/MM/YYYY'
    const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const m = s.match(dmy);
    if (m) {
      const day = parseInt(m[1], 10);
      const mon = parseInt(m[2], 10) - 1;
      const year = parseInt(m[3], 10);
      const d = new Date(year, mon, day);
      return isNaN(d.getTime()) ? null : d;
    }
    // Fallback general
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  get clientesFiltrados(): Cliente[] {
    if (!Array.isArray(this.clientes)) return [];
    let base: Cliente[] = [];
    if (this.filtroTipo === 'todos') base = this.clientes;
    else if (this.filtroTipo === 'clientes') base = this.clientes.filter((c: any) => (c as any).tipo_usuario === 'cliente');
    else if (this.filtroTipo === 'pime') base = this.clientes.filter((c: any) => (c as any).tipo_usuario === 'pime');
    else base = this.clientes.filter((c: any) => (c as any).tipo_usuario === 'funcionario');

    const term = (this.searchTerm || '').toString().trim().toLowerCase();
    if (!term) return base;
    return base.filter((c: any) => {
      const nombre = (c?.nombre || '').toString().toLowerCase();
      const id = (c?.identificacion || '').toString().toLowerCase();
      const placa = (c?.placa || '').toString().toLowerCase();
      return nombre.includes(term) || id.includes(term) || placa.includes(term);
    });
  }

  getStatusColor(cliente: Cliente): string {
    const soatDaysLeftRaw = this.daysUntilDoc(cliente.fecha_soat);
    const tecnoDaysLeftRaw = this.daysUntilDoc(cliente.fecha_tecno);
    if (soatDaysLeftRaw === null && tecnoDaysLeftRaw === null) return 'dot-green';
    const soatDaysLeft = soatDaysLeftRaw ?? Number.POSITIVE_INFINITY;
    const tecnoDaysLeft = tecnoDaysLeftRaw ?? Number.POSITIVE_INFINITY;
    if (soatDaysLeft < 0 || tecnoDaysLeft < 0) return 'dot-red';
    if (soatDaysLeft <= 30 || tecnoDaysLeft <= 30) return 'dot-orange';
    return 'dot-green';
  }

  getStatusTooltip(cliente: Cliente): string {
    const soatBase = this.parseDateFlexible(cliente.fecha_soat);
    const tecnoBase = this.parseDateFlexible(cliente.fecha_tecno);
    const soatExpiry = soatBase ? this.addOneYear(soatBase) : null;
    const tecnoExpiry = tecnoBase ? this.addOneYear(tecnoBase) : null;
    const soatDaysLeftRaw = this.daysUntilDoc(cliente.fecha_soat);
    const tecnoDaysLeftRaw = this.daysUntilDoc(cliente.fecha_tecno);
    if (soatDaysLeftRaw === null && tecnoDaysLeftRaw === null) return 'SIN DATOS - Fechas no disponibles';
    const soatDaysLeft = soatDaysLeftRaw ?? Number.POSITIVE_INFINITY;
    const tecnoDaysLeft = tecnoDaysLeftRaw ?? Number.POSITIVE_INFINITY;

    const fmt = (d: Date | null) => d ? `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}` : 'n/d';

    if (soatDaysLeft < 0 && tecnoDaysLeft < 0) return `VENCIDO - SOAT (${fmt(soatExpiry)}) y Tecnomecánica (${fmt(tecnoExpiry)}) vencidos`;
    if (soatDaysLeft < 0) return `VENCIDO - SOAT vencido (${fmt(soatExpiry)}), hace ${Math.abs(soatDaysLeft)} días`;
    if (tecnoDaysLeft < 0) return `VENCIDO - Tecnomecánica vencida (${fmt(tecnoExpiry)}), hace ${Math.abs(tecnoDaysLeft)} días`;
    if (soatDaysLeft <= 30 && tecnoDaysLeft <= 30) return `POR VENCER - SOAT (${fmt(soatExpiry)}) en ${soatDaysLeft} días, Tecnomecánica (${fmt(tecnoExpiry)}) en ${tecnoDaysLeft} días`;
    if (soatDaysLeft <= 30) return `POR VENCER - SOAT (${fmt(soatExpiry)}) en ${soatDaysLeft} días`;
    if (tecnoDaysLeft <= 30) return `POR VENCER - Tecnomecánica (${fmt(tecnoExpiry)}) en ${tecnoDaysLeft} días`;
    return 'VIGENTE - Todos los documentos al día';
  }
}
