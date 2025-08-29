import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DashboardClienteService } from '../dashboard-cliente/dashboard-cliente.service';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, 
    RouterLink,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  selected: 'perfil' | 'vehiculo' = 'perfil';
  
  perfil = {
    username: '',
    email: '',
    numero_identificacion: '',
    ciudad: '',
    rh: '',
    grupo_sanguineo: '',
    nombres: '',
    apellidos: '',
    ano_nacimiento: '',
    direccion: '',
    telefono: '',
    profile_image_url: ''
  };
  
  mensajeExito = '';

  constructor(private dashboardClienteService: DashboardClienteService) {}

  ngOnInit(): void {
    const username = localStorage.getItem('username');
    if (username) {
      this.dashboardClienteService.getPerfil(username).subscribe({
        next: (data: any) => {
          this.perfil = { ...this.perfil, ...data };
        },
        error: () => {
          // Si no hay perfil, se mantiene vacío
        }
      });
    }
  }

  onSubmit() {
    this.dashboardClienteService.actualizarPerfil(this.perfil).subscribe({
      next: () => {
        this.mensajeExito = '¡Perfil actualizado correctamente!';
        setTimeout(() => this.mensajeExito = '', 3000);
      },
      error: () => {
        this.mensajeExito = 'Error al actualizar el perfil.';
        setTimeout(() => this.mensajeExito = '', 3000);
      }
    });
  }
}