import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpresasService } from '../services/empresas.service';

@Component({
  selector: 'app-dashboard-empresa',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container" style="max-width: 920px; margin: 0 auto;">
      <h2>Panel de Empresa</h2>

      <section class="card" style="background:#fff;border:1px solid #eee;border-radius:8px;padding:16px;margin-top:16px;">
        <h3 style="margin-top:0;">Código de invitación para registro</h3>

        <div class="form-row" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
          <label>Empresa ID</label>
          <input type="text" [(ngModel)]="empresaId" placeholder="ID de tu empresa" style="padding:6px 10px;">
          <button (click)="cargarCodigo()" class="btn">Cargar</button>
        </div>

        <div *ngIf="loading" style="margin-top:8px;">Cargando...</div>
        <div *ngIf="error" style="margin-top:8px;color:#c62828;">{{ error }}</div>

        <div *ngIf="codigo || expira_en || revocado !== null" style="margin-top:16px;">
          <div><strong>Código actual:</strong> <code>{{ codigo || '—' }}</code>
            <button *ngIf="codigo" (click)="copiar()" class="btn" style="margin-left:8px;">Copiar</button>
          </div>
          <div><strong>Expira en:</strong> {{ expira_en || 'Sin expiración' }}</div>
          <div><strong>Estado:</strong> {{ revocado ? 'Revocado' : 'Vigente' }}</div>
        </div>

        <hr style="margin:16px 0;" />

        <div class="form-row" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
          <label>Expira en (días)</label>
          <input type="number" min="1" [(ngModel)]="expiresInDays" placeholder="30" style="width:120px;padding:6px 10px;">
          <button (click)="rotar()" class="btn primary">Generar / Rotar código</button>
          <button (click)="revocar()" class="btn danger" [disabled]="!codigo || revocado">Revocar</button>
        </div>

        <div *ngIf="msg" style="margin-top:8px;color:#2e7d32;">{{ msg }}</div>
      </section>
    </div>
  `,
  styles: [
    `.btn{padding:6px 12px;border:1px solid #ddd;border-radius:6px;background:#fafafa;cursor:pointer}
     .btn:hover{background:#f0f0f0}
     .btn.primary{background:#e53935;color:#fff;border-color:#e53935}
     .btn.primary:hover{background:#d32f2f}
     .btn.danger{background:#fff;color:#d32f2f;border-color:#d32f2f}
     .btn.danger:hover{background:#ffebee}`
  ]
})
export class DashboardEmpresaComponent {
  empresaId: string = localStorage.getItem('empresa_id') || '';
  codigo: string | undefined;
  expira_en: string | undefined;
  revocado: boolean | null = null;
  expiresInDays: number | null = 30;
  loading = false;
  error: string | null = null;
  msg: string | null = null;

  constructor(private empresas: EmpresasService) {}

  ngOnInit() {
    if (this.empresaId) this.cargarCodigo();
  }

  cargarCodigo() {
    if (!this.empresaId) { this.error = 'Debes indicar el ID de la empresa.'; return; }
    this.loading = true; this.error = null; this.msg = null;
    this.empresas.getCodigo(this.empresaId).subscribe({
      next: (res) => {
        this.codigo = (res as any).codigo;
        this.expira_en = (res as any).expira_en;
        this.revocado = (res as any).revocado ?? false;
        this.loading = false;
      },
      error: () => { this.loading = false; this.error = 'No se pudo obtener el código.'; }
    });
  }

  rotar() {
    if (!this.empresaId) { this.error = 'Debes indicar el ID de la empresa.'; return; }
    this.loading = true; this.error = null; this.msg = null;
    this.empresas.rotarCodigo(this.empresaId, this.expiresInDays ?? undefined).subscribe({
      next: (res) => {
        this.codigo = res.codigo;
        this.expira_en = res.expira_en;
        this.revocado = false;
        this.loading = false;
        this.msg = 'Código generado/rotado correctamente';
      },
      error: () => { this.loading = false; this.error = 'No se pudo generar/rotar el código.'; }
    });
  }

  revocar() {
    if (!this.empresaId) { this.error = 'Debes indicar el ID de la empresa.'; return; }
    this.loading = true; this.error = null; this.msg = null;
    this.empresas.revocarCodigo(this.empresaId).subscribe({
      next: () => { this.revocado = true; this.loading = false; this.msg = 'Código revocado.'; },
      error: () => { this.loading = false; this.error = 'No se pudo revocar el código.'; }
    });
  }

  async copiar() {
    try {
      if (this.codigo) {
        await navigator.clipboard.writeText(this.codigo);
        this.msg = 'Código copiado al portapapeles';
      }
    } catch {}
  }
}
