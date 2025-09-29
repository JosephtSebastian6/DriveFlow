import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardEmpresaAsignarService, VehiculoPayload } from './dashboard-empresa-asignar.service';
import { AdminUsuariosService, UsuarioResumen } from '../dashboard-admin-usuarios/admin-usuarios.service';
import { EmpresasService, Empresa, UsuarioEmpresaResumen } from '../services/empresas.service';

@Component({
  selector: 'app-dashboard-empresa-asignar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrls: ['./dashboard-empresa-asignar.css'],
  templateUrl: './dashboard-empresa-asignar.html'
})
export class DashboardEmpresaAsignarComponent {
  // Usuarios cargados para seleccionar
  empresas: Empresa[] = [];
  selectedEmpresaId: string | number | '' = '';
  usuarios: (UsuarioResumen | UsuarioEmpresaResumen)[] = [];
  selectedUsername: string = '';
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

  constructor(
    private service: DashboardEmpresaAsignarService,
    private adminUsuarios: AdminUsuariosService,
    private empresasService: EmpresasService
  ) {
    const myUsername = localStorage.getItem('username') || '';
    if (myUsername) {
      this.service.listarMisVehiculos(myUsername).subscribe({
        next: (lista) => this.misVehiculos = Array.isArray(lista) ? lista : [],
        error: () => this.misVehiculos = []
      });
    }

    // Cargar empresas disponibles para el usuario actual (o todas, según permisos)
    this.empresasService.listEmpresas().subscribe({
      next: (lista) => this.empresas = Array.isArray(lista) ? lista : [],
      error: () => this.empresas = []
    });
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
    if (!this.selectedEmpresaId) {
      this.errorMsg = 'Debes seleccionar una empresa.';
      return;
    }
    if (!this.selectedUsername) {
      this.errorMsg = 'Debes seleccionar un usuario registrado.';
      return;
    }
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
    this.service.asignarVehiculoAUsuario(this.selectedUsername, this.vehiculo).subscribe({
      next: (res) => {
        this.loading = false;
        this.resultMsg = `Vehículo ${res.vehiculo?.placa || ''} asignado a ${this.selectedUsername}.`;
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.detail || 'No fue posible completar la operación';
      }
    });
  }

  onEmpresaChange(event: any) {
    const empId = event?.target?.value || '';
    this.selectedEmpresaId = empId;
    this.selectedUsername = '';
    this.usuarios = [];
    if (!empId) return;
    this.empresasService.listUsuariosDeEmpresa(empId).subscribe({
      next: (lista) => this.usuarios = Array.isArray(lista) ? lista : [],
      error: () => this.usuarios = []
    });
  }
}
