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
  // Formulario del vehículo actualmente seleccionado/edición
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

  // Estado para múltiples vehículos
  vehiculos: any[] = [];
  vehiculoSeleccionadoId: number | null = null;

  constructor(private dashboardClienteService: DashboardClienteService) {}

  ngOnInit() {
    const username = localStorage.getItem('username');
    if (!username) return;

    // Nuevo flujo: listar múltiples vehículos
    this.dashboardClienteService.listarVehiculos(username).subscribe({
      next: (lista) => {
        this.vehiculos = lista || [];
        if (this.vehiculos.length > 0) {
          const primero = this.vehiculos[0];
          this.vehiculoSeleccionadoId = primero.id;
          this.vehiculo = this.mapFromApi(primero);
        } else {
          // Compatibilidad: si no hay registros, intenta cargar el único vehículo (endpoint anterior)
          this.dashboardClienteService.getVehiculo(username).subscribe({
            next: (data: any) => {
              this.vehiculo = { ...this.vehiculo, ...data };
              this.vehiculoSeleccionadoId = null; // Modo crear
            },
            error: () => {
              // Mantener formulario vacío
            }
          });
        }
      },
      error: () => {
        // Si falla el nuevo endpoint, caemos al anterior para no romper UX
        this.dashboardClienteService.getVehiculo(username).subscribe({
          next: (data: any) => {
            this.vehiculo = { ...this.vehiculo, ...data };
            this.vehiculoSeleccionadoId = null;
          }
        });
      }
    });
  }

  onSubmitVehiculo() {
    const username = localStorage.getItem('username');
    if (!username) return;

    const data = { ...this.vehiculo };

    // Si hay un ID seleccionado, actualizamos; si no, creamos
    const obs = this.vehiculoSeleccionadoId != null
      ? this.dashboardClienteService.actualizarVehiculo(this.vehiculoSeleccionadoId, data)
      : this.dashboardClienteService.crearVehiculo(username, data);

    obs.subscribe({
      next: (saved) => {
        this.mensajeVehiculo = '¡Vehículo guardado correctamente!';
        setTimeout(() => this.mensajeVehiculo = '', 3000);
        this.refrescarListaYSeleccionar(username, saved?.id);
      },
      error: () => {
        this.mensajeVehiculo = 'Error al guardar el vehículo.';
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

  seleccionarVehiculo(id: number) {
    const v = this.vehiculos.find(x => x.id === id);
    if (!v) return;
    this.vehiculoSeleccionadoId = id;
    this.vehiculo = this.mapFromApi(v);
  }

  nuevoVehiculo() {
    this.vehiculoSeleccionadoId = null;
    this.vehiculo = { marca: '', modelo: '', ano: '', placa: '', fecha_soat: '', fecha_tecno: '', color: '', vehiculo_image_url: '' };
  }

  eliminarVehiculo() {
    if (this.vehiculoSeleccionadoId == null) return;
    this.dashboardClienteService.eliminarVehiculo(this.vehiculoSeleccionadoId).subscribe({
      next: () => {
        const username = localStorage.getItem('username')!;
        this.refrescarListaYSeleccionar(username, null);
      }
    });
  }

  private refrescarListaYSeleccionar(username: string, idSeleccion?: number | null) {
    this.dashboardClienteService.listarVehiculos(username).subscribe(lista => {
      this.vehiculos = lista || [];
      if (this.vehiculos.length === 0) {
        this.nuevoVehiculo();
        return;
      }
      const id = idSeleccion ?? this.vehiculos[0].id;
      this.seleccionarVehiculo(id);
    });
  }

  private mapFromApi(v: any) {
    return {
      marca: v.marca || '',
      modelo: v.modelo || '',
      ano: v.ano || '',
      placa: v.placa || '',
      fecha_soat: v.fecha_soat || '',
      fecha_tecno: v.fecha_tecno || '',
      color: v.color || '',
      vehiculo_image_url: v.vehiculo_image_url || ''
    };
  }
}
