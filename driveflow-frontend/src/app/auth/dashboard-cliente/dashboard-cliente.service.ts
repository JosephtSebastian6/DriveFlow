import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DashboardClienteService {
  private apiUrl = 'http://localhost:8000/auth/update-perfil';

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
}
