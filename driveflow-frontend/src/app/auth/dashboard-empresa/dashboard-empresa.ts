import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpresasService } from '../services/empresas.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-dashboard-empresa',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <header class="page-header">
        <h2>Panel de Empresa</h2>
        <div class="empresa-id">
          <span class="label">Empresa ID</span>
          <span class="empresa-id-pill">{{ empresaId || '—' }}</span>
          <button (click)="cargarCodigo()" class="btn ghost">Actualizar</button>
        </div>
      </header>

      <section class="card">
        <div class="card-header">
          <h3>Código de invitación para registro</h3>
        </div>

        <div class="card-body">
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Código actual</div>
              <div class="info-value code">
                <code>{{ codigo || '—' }}</code>
                <button *ngIf="codigo" (click)="copiar()" class="btn ghost sm">Copiar</button>
              </div>
            </div>
            <div class="info-item">
              <div class="info-label">Expira en</div>
              <div class="info-value">{{ expira_en || 'Sin expiración' }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Estado</div>
              <div class="info-value">
                <span [class]="revocado ? 'chip chip-danger' : 'chip chip-success'">{{ revocado ? 'Revocado' : 'Vigente' }}</span>
              </div>
            </div>
          </div>

          <div class="divider"></div>

          <div class="controls">
            <div class="field">
              <label>Expira en (días)</label>
              <input type="number" [(ngModel)]="expiresInDays" placeholder="30" min="1">
            </div>
            <div class="actions">
              <button class="btn primary" (click)="rotar()">Generar / Rotar código</button>
              <button class="btn danger" (click)="revocar()" [disabled]="!codigo || revocado">Revocar</button>
            </div>
          </div>

          <div *ngIf="loading" class="hint loading">Cargando...</div>
          <div *ngIf="error" class="hint error">{{ error }}</div>
          <div *ngIf="msg" class="hint success">{{ msg }}</div>
        </div>
      </section>
    </div>
  `,
  styles: [
    `:host{display:block}
     .container{max-width:980px;margin:0 auto;padding:8px 16px}
     .page-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:10px 0 6px}
     .page-header h2{margin:0;font-size:20px;font-weight:700;color:#111}
     .empresa-id{display:flex;align-items:center;gap:8px}
     .empresa-id .label{font-size:12px;color:#666}
     .empresa-id-pill{display:inline-block;padding:6px 10px;background:#f5f5f5;border:1px solid #e0e0e0;border-radius:8px;min-width:80px;text-align:center;font-weight:600;color:#333}

     .card{background:#fff;border:1px solid #eee;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.05);margin-top:12px}
     .card-header{padding:14px 16px;border-bottom:1px solid #f0f0f0}
     .card-header h3{margin:0;font-size:16px;color:#222}
     .card-body{padding:16px}

     .info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
     @media (max-width:800px){.info-grid{grid-template-columns:1fr}}
     .info-item{background:#fafafa;border:1px solid #efefef;border-radius:10px;padding:12px}
     .info-label{font-size:12px;color:#666;margin-bottom:6px}
     .info-value{font-size:14px;color:#222;display:flex;align-items:center;gap:8px}
     .info-value.code code{background:#111;color:#fff;padding:6px 10px;border-radius:8px}

     .divider{height:1px;background:#f0f0f0;margin:16px 0}

     .controls{display:grid;grid-template-columns:1fr auto;gap:16px;align-items:end}
     @media (max-width:700px){.controls{grid-template-columns:1fr}}
     .field label{display:block;font-size:12px;color:#666;margin-bottom:6px}
     .field input{width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:8px;outline:none}
     .field input:focus{border-color:#e53935;box-shadow:0 0 0 3px rgba(229,57,53,.12)}

     .actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
     .btn{padding:8px 14px;border:1px solid #ddd;border-radius:8px;background:#fafafa;cursor:pointer;transition:all .15s ease;font-weight:600}
     .btn:hover{background:#f0f0f0}
     .btn.sm{padding:6px 10px;font-size:12px}
     .btn.ghost{background:#fff}
     .btn.primary{background:#e53935;color:#fff;border-color:#e53935}
     .btn.primary:hover{background:#d32f2f}
     .btn.danger{background:#fff;color:#d32f2f;border-color:#d32f2f}
     .btn.danger:hover{background:#ffebee}

     .chip{display:inline-block;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:700}
     .chip-success{background:#e8f5e9;color:#1b5e20;border:1px solid #c8e6c9}
     .chip-danger{background:#ffebee;color:#b71c1c;border:1px solid #ffcdd2}

     .hint{margin-top:10px;font-size:13px}
     .hint.error{color:#c62828}
     .hint.success{color:#2e7d32}
     .hint.loading{color:#666}
    `
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

  constructor(private empresas: EmpresasService, private http: HttpClient) {}

  ngOnInit() {
    const username = localStorage.getItem('username');
    const cached = localStorage.getItem('empresa_id');
    if (cached) {
      this.empresaId = cached;
    }

    if (username) {
      this.http.get<any>(`http://localhost:8000/auth/perfil/${username}`).subscribe({
        next: (perfil) => {
          // Para usuarios de tipo empresa/pime usamos su propio identificador como empresa_id
          const id = perfil?.identificador;
          if (id) {
            this.empresaId = String(id);
            localStorage.setItem('empresa_id', this.empresaId);
            this.cargarCodigo();
          } else if (!this.empresaId) {
            // Si no obtuvimos id y no hay cache, mostramos error sutil
            this.error = 'No se pudo determinar el ID de la empresa.';
          }
        },
        error: () => {
          if (!this.empresaId) this.error = 'No se pudo cargar el perfil para obtener el ID de la empresa.';
        }
      });
    } else if (this.empresaId) {
      this.cargarCodigo();
    }
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
