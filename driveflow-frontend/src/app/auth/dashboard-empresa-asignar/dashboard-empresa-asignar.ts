import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardEmpresaAsignarService, UserPayload, VehiculoPayload } from './dashboard-empresa-asignar.service';

@Component({
  selector: 'app-dashboard-empresa-asignar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrls: ['./dashboard-empresa-asignar.css'],
  templateUrl: './dashboard-empresa-asignar.html'
})
export class DashboardEmpresaAsignarComponent {
  user: UserPayload = {
    tipo_usuario: 'funcionario',
    username: '',
    email: '',
    nombres: '',
    apellidos: '',
    telefono: ''
  };
  vehiculo: VehiculoPayload = {
    marca: '', modelo: '', ano: '', placa: '',
    fecha_soat: '', fecha_tecno: '', color: '', vehiculo_image_url: '', gps_activo: false
  };

  tempPassword: string | null = null;
  resultMsg: string | null = null;
  errorMsg: string | null = null;
  loading = false;

  misVehiculos: any[] = [];
  selectedVehiculoId: number | null = null;

  constructor(private service: DashboardEmpresaAsignarService) {
    const myUsername = localStorage.getItem('username') || '';
    if (myUsername) {
      this.service.listarMisVehiculos(myUsername).subscribe({
        next: (lista) => this.misVehiculos = Array.isArray(lista) ? lista : [],
        error: () => this.misVehiculos = []
      });
    }
  }

  onSelectVehiculoExistente(event: any) {
    const id = parseInt(event.target.value, 10);
    const v = this.misVehiculos.find(x => x.id === id);
    if (!v) { this.selectedVehiculoId = null; return; }
    this.selectedVehiculoId = id;
    this.vehiculo = {
      marca: v.marca || '',
      modelo: v.modelo || '',
      ano: v.ano || '',
      placa: v.placa || '',
      fecha_soat: v.fecha_soat || '',
      fecha_tecno: v.fecha_tecno || '',
      color: v.color || '',
      vehiculo_image_url: v.vehiculo_image_url || '',
      gps_activo: !!v.gps_activo
    };
  }

  crear() {
    this.resultMsg = null; this.errorMsg = null; this.tempPassword = null;
    // Validaciones: si hay vehículo seleccionado, solo se permite enviar con esos datos (solo lectura)
    if (this.selectedVehiculoId) {
      if (!this.vehiculo.placa) {
        this.errorMsg = 'Debes seleccionar un vehículo válido (con placa)';
        return;
      }
    } else {
      // Si no selecciona uno existente, al menos la placa es obligatoria para crear
      if (!this.vehiculo.placa) {
        this.errorMsg = 'La placa del vehículo es obligatoria';
        return;
      }
    }

    this.loading = true;
    this.service.crearUsuarioVehiculo({ user: this.user, vehiculo: this.vehiculo }).subscribe({
      next: (res) => {
        this.loading = false;
        this.tempPassword = res.temp_password || null;
        this.resultMsg = `Usuario ${res.user.username} creado y vehículo ${res.vehiculo.placa || ''} asignado.`;
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.detail || 'No fue posible completar la operación';
      }
    });
  }
}
