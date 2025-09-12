import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DashboardClienteService {
  private apiUrl = 'http://localhost:8000/auth/update-perfil';
  private baseAuthUrl = 'http://localhost:8000/auth';

  getPerfil(username: string) {
    return this.http.get(`http://localhost:8000/auth/perfil/${username}`);
  }

  getVehiculo(username: string) {
    return this.http.get(`http://localhost:8000/auth/vehiculo/${username}`);
  }

  constructor(private http: HttpClient) {}

  actualizarPerfil(perfil: any): Observable<any> {
    return this.http.put(this.apiUrl, perfil);
  }

  guardarVehiculo(vehiculo: any): Observable<any> {
    return this.http.put('http://localhost:8000/auth/vehiculo', vehiculo);
  }

  // ------- NUEVOS MÉTODOS: MULTI-VEHÍCULO -------
  listarVehiculos(username: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseAuthUrl}/vehiculos/${username}`);
  }

  crearVehiculo(username: string, data: any): Observable<any> {
    return this.http.post<any>(`${this.baseAuthUrl}/vehiculos/${username}`, data);
  }

  actualizarVehiculo(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseAuthUrl}/vehiculos/${id}`, data);
  }

  eliminarVehiculo(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseAuthUrl}/vehiculos/${id}`);
  }
}
