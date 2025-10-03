import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardEmpresaAsignarService, VehiculoPayload } from './dashboard-empresa-asignar.service';
import { AdminUsuariosService, UsuarioResumen } from '../dashboard-admin-usuarios/admin-usuarios.service';
import { EmpresasService, Empresa, UsuarioEmpresaResumen } from '../services/empresas.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-dashboard-empresa-asignar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrls: ['./dashboard-empresa-asignar.css'],
  templateUrl: './dashboard-empresa-asignar.html'
})
export class DashboardEmpresaAsignarComponent implements OnInit {
  // Usuarios cargados para seleccionar
  selectedEmpresaId: string = '';
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
    private empresasService: EmpresasService,
    private http: HttpClient
  ) {
    const myUsername = localStorage.getItem('username') || '';
    if (myUsername) {
      this.service.listarMisVehiculos(myUsername).subscribe({
        next: (lista) => this.misVehiculos = Array.isArray(lista) ? lista : [],
        error: () => this.misVehiculos = []
      });
    }

    // Resolver empresa del usuario actual y cargar usuarios asociados
    const cached = localStorage.getItem('empresa_id');
    if (cached) {
      this.selectedEmpresaId = cached;
      this.cargarUsuariosDeEmpresa();
    } else if (myUsername) {
      this.http.get<any>(`http://localhost:8000/auth/perfil/${myUsername}`).subscribe({
        next: (perfil) => {
          const id = perfil?.identificador;
          if (id) {
            this.selectedEmpresaId = String(id);
            localStorage.setItem('empresa_id', this.selectedEmpresaId);
            this.cargarUsuariosDeEmpresa();
          }
        },
        error: () => {}
      });
    }
  }

  ngOnInit(): void {
    // Doble verificación por si el constructor no alcanzó a resolver antes del render
    const cached = localStorage.getItem('empresa_id');
    if (!this.selectedEmpresaId && cached) {
      this.selectedEmpresaId = cached;
    }
    if (this.selectedEmpresaId && (!this.usuarios || this.usuarios.length === 0)) {
      this.cargarUsuariosDeEmpresa();
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
    const empresaId = this.selectedEmpresaId || localStorage.getItem('empresa_id') || undefined;
    this.service.asignarVehiculoAUsuario(this.selectedUsername, this.vehiculo, empresaId).subscribe({
      next: (res) => {
        this.loading = false;
        this.resultMsg = `Vehículo ${res.vehiculo?.placa || ''} asignado a ${this.selectedUsername}. El usuario lo verá en su panel "Mi Vehículo" al ingresar o recargar.`;
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.detail || 'No fue posible completar la operación';
      }
    });
  }

  private cargarUsuariosDeEmpresa() {
    if (!this.selectedEmpresaId) return;
    this.selectedUsername = '';
    this.usuarios = [];
    this.empresasService.listUsuariosDeEmpresa(this.selectedEmpresaId).subscribe({
      next: (lista) => this.usuarios = Array.isArray(lista) ? lista : [],
      error: () => this.usuarios = []
    });
  }

  refreshUsuarios() {
    this.cargarUsuariosDeEmpresa();
  }
}
