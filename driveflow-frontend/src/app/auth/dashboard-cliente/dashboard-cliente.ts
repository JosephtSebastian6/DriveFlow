
import { Component, OnInit } from '@angular/core';
import { DashboardClienteService } from './dashboard-cliente.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-dashboard-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './dashboard-cliente.css',
  templateUrl: './dashboard-cliente.html',
})
export class DashboardClienteComponent implements OnInit {
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
  vehiculo = {
    marca: '',
    modelo: '',
    ano: '',
    placa: '',
    fecha_soat: '',
    fecha_tecno: '',
    color: '',
    vehiculo_image_url: ''
  };
  mensajeExito = '';
  mensajeVehiculo = '';

  constructor(private dashboardClienteService: DashboardClienteService) {}

  ngOnInit() {
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
      this.dashboardClienteService.getVehiculo(username).subscribe({
        next: (data: any) => {
          this.vehiculo = { ...this.vehiculo, ...data };
        },
        error: () => {
          // Si no hay vehículo, se mantiene vacío
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

  onSubmitVehiculo() {
  const username = localStorage.getItem('username');
  const vehiculoData = { ...this.vehiculo, username }; // Asegura que username no esté vacío
  this.dashboardClienteService.guardarVehiculo(vehiculoData).subscribe({
    next: () => {
      this.mensajeVehiculo = '¡Vehículo actualizado correctamente!';
      setTimeout(() => this.mensajeVehiculo = '', 3000);
    },
    error: () => {
      this.mensajeVehiculo = 'Error al actualizar el vehículo.';
      setTimeout(() => this.mensajeVehiculo = '', 3000);
    }
  });
}
  getSoatVenceEn(): string {
    if (!this.vehiculo.fecha_soat) return '';
    const fecha = new Date(this.vehiculo.fecha_soat);
    fecha.setFullYear(fecha.getFullYear() + 1);
    return fecha.toLocaleDateString();
  }

  getTecnoVenceEn(): string {
    if (!this.vehiculo.fecha_tecno) return '';
    const fecha = new Date(this.vehiculo.fecha_tecno);
    fecha.setFullYear(fecha.getFullYear() + 1);
    return fecha.toLocaleDateString();
  }
}


