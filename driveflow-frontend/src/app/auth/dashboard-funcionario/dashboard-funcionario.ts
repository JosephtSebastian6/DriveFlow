import { Component, OnInit } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { PerfilFuncionario } from '../models/perfil-funcionario.model';
import { VehiculoFuncionario } from '../models/vehiculo-funcionario.model';

@Component({
  selector: 'app-dashboard-funcionario',
  standalone: true,
  imports: [JsonPipe],
  template: `
    <h2>Bienvenido Funcionario</h2>
    <div *ngIf="perfil">
      <h3>Mi Perfil</h3>
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

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const username = localStorage.getItem('username');
    if (username) {
      this.http.get<PerfilFuncionario>(`http://localhost:8000/funcionario/perfil/${username}`)
        .subscribe({
          next: (data) => this.perfil = data,
          error: () => this.perfil = null
        });
      this.http.get<VehiculoFuncionario>(`http://localhost:8000/funcionario/vehiculo/${username}`)
        .subscribe({
          next: (data) => this.vehiculo = data,
          error: () => this.vehiculo = null
        });
    }
  }
}
