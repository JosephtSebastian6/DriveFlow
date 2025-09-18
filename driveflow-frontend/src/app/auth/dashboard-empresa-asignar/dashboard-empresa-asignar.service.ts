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

@Injectable({ providedIn: 'root' })
export class DashboardEmpresaAsignarService {
  private apiUrl = 'http://localhost:8000/auth/empresa/crear-usuario-vehiculo';
  constructor(private http: HttpClient) {}

  crearUsuarioVehiculo(payload: { user: UserPayload; vehiculo: VehiculoPayload }): Observable<CrearUsuarioVehiculoResponse> {
    return this.http.post<CrearUsuarioVehiculoResponse>(this.apiUrl, payload);
  }

  listarMisVehiculos(username: string) {
    return this.http.get<any[]>(`http://localhost:8000/auth/usuarios/${username}/vehiculos`);
  }
}
