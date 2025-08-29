import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DispositivosService, VehiculoBuscado } from './dashboard-empresa-dispositivos.service';

@Component({
  selector: 'app-dashboard-empresa-dispositivos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-empresa-dispositivos.html',
  styleUrl: './dashboard-empresa-dispositivos.css'
})
export class DashboardEmpresaDispositivos implements OnInit {
  placaBusqueda: string = '';
  vehiculos: VehiculoBuscado[] = [];
  vehiculoSeleccionado: VehiculoBuscado | null = null;
  mensaje: string = '';
  vehiculosActivos: VehiculoBuscado[] = [];
  vehiculosInactivos: VehiculoBuscado[] = [];

  constructor(private dispositivosService: DispositivosService) { }

  ngOnInit() {
    this.cargarVehiculosActivos();
    this.cargarVehiculosInactivos();
  }

  cargarVehiculosActivos() {
    this.dispositivosService.getVehiculosActivos().subscribe({
      next: (data) => {
        this.vehiculosActivos = data;
      },
      error: (err) => {
        console.error('Error al cargar vehículos activos', err);
        this.mensaje = 'Error al cargar los vehículos con GPS activo.';
      }
    });
  }

  cargarVehiculosInactivos() {
    this.dispositivosService.getVehiculosInactivos().subscribe({
      next: (data) => {
        this.vehiculosInactivos = data;
      },
      error: (err) => {
        console.error('Error al cargar vehículos inactivos', err);
        this.mensaje = 'Error al cargar los vehículos con GPS inactivo.';
      }
    });
  }

  buscarVehiculos() {
    if (this.placaBusqueda.trim()) {
      this.dispositivosService.searchVehiculos(this.placaBusqueda).subscribe(data => {
        this.vehiculos = data;
        this.vehiculoSeleccionado = null;
        if (data.length === 0) {
          this.mensaje = 'No se encontraron vehículos con esa placa.';
        } else {
          this.mensaje = '';
        }
      });
    } else {
      this.vehiculos = [];
      this.mensaje = 'Por favor, ingrese una placa para buscar.';
    }
  }

  seleccionarVehiculo(vehiculo: VehiculoBuscado) {
    this.vehiculoSeleccionado = vehiculo;
  }

  activarGps() {
    if (this.vehiculoSeleccionado) {
      this.dispositivosService.activarGps(this.vehiculoSeleccionado.placa).subscribe(response => {
        this.mensaje = response.message;
        // Opcional: actualizar estado o limpiar selección
        this.vehiculoSeleccionado = null;
        this.vehiculos = [];
        this.placaBusqueda = '';
        this.cargarVehiculosActivos(); // Recargar la lista de vehículos activos
        this.cargarVehiculosInactivos(); // Recargar la lista de vehículos inactivos
      }, error => {
        this.mensaje = 'Error al activar el GPS.';
        console.error(error);
      });
    }
  }
}
