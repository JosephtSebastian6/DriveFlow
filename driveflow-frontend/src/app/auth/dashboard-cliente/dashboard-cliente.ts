
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
    profile_image_url: '',
    // Soporte PIME
    tipo_usuario: '',
    rut: '',
    camara_comercio: '',
    // Asociación a empresa (si aplica)
    empresa_id_asociada: null as number | null,
    empresa_nombre_asociada: ''
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
  empresa_code_input: string = '';
  asociar_msg: string = '';
  asociar_err: string = '';

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
      // Refrescar perfil por si hubo promoción a PIME en backend
      if (username) {
        this.dashboardClienteService.getPerfil(username).subscribe((perfilActual: any) => {
          this.perfil = { ...this.perfil, ...perfilActual };
        });
        // También consultar número de vehículos (multi-vehículo) y forzar UI si >=4
        this.dashboardClienteService.listarVehiculos(username).subscribe((lista) => {
          if (Array.isArray(lista) && lista.length >= 4 && (this.perfil.tipo_usuario || '').toLowerCase() !== 'pime') {
            this.perfil.tipo_usuario = 'pime';
          }
        }, () => {});
      }
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

  asociarEmpresa() {
    const username = localStorage.getItem('username') || this.perfil.username;
    const code = (this.empresa_code_input || '').trim();
    if (!username || !code) {
      this.asociar_err = 'Debes ingresar el código de empresa';
      this.asociar_msg = '';
      return;
    }
    this.asociar_err = '';
    this.asociar_msg = '';
    this.dashboardClienteService.asociarEmpresa(username, code).subscribe({
      next: (res) => {
        this.asociar_msg = 'Asociación exitosa';
        // Refrescar perfil para mostrar empresa asociada
        this.dashboardClienteService.getPerfil(username).subscribe((data: any) => {
          this.perfil = { ...this.perfil, ...data };
        });
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


