import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserPayload {
  tipo_usuario: 'cliente' | 'funcionario';
  username: string;
  email: string;
  nombres?: string;
  apellidos?: string;
  telefono?: string;
}

export interface VehiculoPayload {
  marca?: string;
  modelo?: string;
  ano?: string;
  placa: string;
  fecha_soat?: string;
  fecha_tecno?: string;
  color?: string;
  vehiculo_image_url?: string;
  gps_activo?: boolean;
}

export interface CrearUsuarioVehiculoResponse {
  user: { username: string; email: string; tipo_usuario: string };
  vehiculo: { id?: number; placa?: string };
  temp_password?: string;
}

export interface AsignarVehiculoResponse {
  usuario: { username: string };
  vehiculo: { id?: number; placa?: string };
}

@Injectable({ providedIn: 'root' })
export class DashboardEmpresaAsignarService {
  private apiUrl = 'http://localhost:8000/auth/empresa/crear-usuario-vehiculo';
  constructor(private http: HttpClient) {}

  crearUsuarioVehiculo(payload: { user: UserPayload; vehiculo: VehiculoPayload }): Observable<CrearUsuarioVehiculoResponse> {
    return this.http.post<CrearUsuarioVehiculoResponse>(this.apiUrl, payload);
  }

  // Endpoint tentativo para asignar vehículo a usuario existente.
  // Ajusta la URL si tu backend define otra ruta.
  asignarVehiculoAUsuario(username: string, vehiculo: VehiculoPayload, empresaId?: string | number): Observable<AsignarVehiculoResponse> {
    const url = `http://localhost:8000/auth/usuarios/${encodeURIComponent(username)}/vehiculos`;
    // Enviamos los datos del vehículo y la empresa para validar relación en backend
    const body: any = { ...vehiculo };
    if (empresaId !== undefined && empresaId !== '') {
      body.empresa_id = empresaId;
    }
    return this.http.post<AsignarVehiculoResponse>(url, body);
  }

  listarMisVehiculos(username: string) {
    return this.http.get<any[]>(`http://localhost:8000/auth/usuarios/${username}/vehiculos`);
  }
}
