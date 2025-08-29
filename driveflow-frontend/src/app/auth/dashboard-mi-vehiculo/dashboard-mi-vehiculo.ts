import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardClienteService } from '../dashboard-cliente/dashboard-cliente.service';

@Component({
  selector: 'app-dashboard-mi-vehiculo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-mi-vehiculo.html',
  styleUrls: ['./dashboard-mi-vehiculo.css']
})
export class DashboardMiVehiculoComponent implements OnInit {
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
  mensajeVehiculo = '';

  constructor(private dashboardClienteService: DashboardClienteService) {}

  ngOnInit() {
    const username = localStorage.getItem('username');
    if (username) {
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

  onSubmitVehiculo() {
    const username = localStorage.getItem('username');
    const vehiculoData = { ...this.vehiculo, username };
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
