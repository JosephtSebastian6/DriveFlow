import { Component, OnInit } from '@angular/core';
import { JsonPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { PerfilFuncionario } from '../models/perfil-funcionario.model';
import { VehiculoFuncionario } from '../models/vehiculo-funcionario.model';

@Component({
  selector: 'app-dashboard-funcionario',
  standalone: true,
  imports: [JsonPipe, CommonModule, FormsModule],
  template: `
    <h2>Bienvenido Funcionario</h2>
    <div *ngIf="perfil">
      <h3>Mi Perfil</h3>
      <div *ngIf="perfil.empresa_id_asociada" style="background:#e8f5e9;border:1px solid #c8e6c9;color:#1b5e20;padding:10px 12px;border-radius:8px;margin-bottom:12px;">
        Asociado a la empresa: <strong>{{ perfil.empresa_nombre_asociada || ('ID ' + perfil.empresa_id_asociada) }}</strong>
      </div>
      <div *ngIf="!perfil.empresa_id_asociada" style="background:#fff3e0;border:1px solid #ffe0b2;color:#e65100;padding:10px 12px;border-radius:8px;margin-bottom:12px;">
        ¿Tienes un código de empresa? Asóciate aquí:
        <div style="margin-top:8px; display:flex; gap:8px; align-items:center;">
          <input type="text" [(ngModel)]="empresa_code_input" placeholder="Código de empresa" style="padding:6px 10px;">
          <button type="button" (click)="asociarEmpresa()" style="padding:6px 12px;background:#d32f2f;color:#fff;border:none;border-radius:6px;cursor:pointer;">Asociar</button>
        </div>
        <div *ngIf="asociar_msg" style="margin-top:6px; color:#2e7d32;">{{ asociar_msg }}</div>
        <div *ngIf="asociar_err" style="margin-top:6px; color:#c62828;">{{ asociar_err }}</div>
      </div>
      <pre>{{ perfil | json }}</pre>
    </div>
    <div *ngIf="vehiculo">
      <h3>Mi Vehículo</h3>
      <pre>{{ vehiculo | json }}</pre>
    </div>
  `
})

export class DashboardFuncionarioComponent implements OnInit {
  perfil: PerfilFuncionario | null = null;
  vehiculo: VehiculoFuncionario | null = null;
  empresa_code_input: string = '';
  asociar_msg: string = '';
  asociar_err: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const username = localStorage.getItem('username');
    if (username) {
      this.http.get<PerfilFuncionario>(`http://localhost:8000/auth/funcionario/perfil/${username}`)
        .subscribe({
          next: (data) => this.perfil = data,
          error: () => this.perfil = null
        });
      this.http.get<VehiculoFuncionario>(`http://localhost:8000/auth/funcionario/vehiculo/${username}`)
        .subscribe({
          next: (data) => this.vehiculo = data,
          error: () => this.vehiculo = null
        });
    }
  }

  asociarEmpresa() {
    const username = localStorage.getItem('username');
    const code = (this.empresa_code_input || '').trim();
    if (!username || !code) {
      this.asociar_err = 'Debes ingresar el código de empresa';
      this.asociar_msg = '';
      return;
    }
    this.asociar_err = '';
    this.asociar_msg = '';
    this.http.post(`http://localhost:8000/auth/empresas/asociar`, { username, empresa_code: code })
      .subscribe({
        next: (res: any) => {
          this.asociar_msg = 'Asociación exitosa';
          // Refrescar perfil para mostrar empresa asociada
          this.http.get<PerfilFuncionario>(`http://localhost:8000/auth/funcionario/perfil/${username}`)
            .subscribe({ next: (data) => this.perfil = data });
          setTimeout(() => this.asociar_msg = '', 3000);
        },
        error: (err) => {
          const detail = err?.error?.detail || 'No se pudo asociar a la empresa';
          this.asociar_err = detail;
          setTimeout(() => this.asociar_err = '', 4000);
        }
      });
  }
}
