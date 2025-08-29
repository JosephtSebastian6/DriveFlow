import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface VehiculoBuscado {
  placa: string;
  modelo: string;
  color: string;
  propietario_nombre: string;
  propietario_tipo: string;
}

@Injectable({
  providedIn: 'root'
})
export class DispositivosService {
  private apiUrl = 'http://localhost:8000/auth';

  getVehiculosActivos(): Observable<VehiculoBuscado[]> {
    return this.http.get<VehiculoBuscado[]>(`${this.apiUrl}/vehiculos/activos`);
  }

  getVehiculosInactivos(): Observable<VehiculoBuscado[]> {
    return this.http.get<VehiculoBuscado[]>(`${this.apiUrl}/vehiculos/inactivos`);
  }

  constructor(private http: HttpClient) { }

  searchVehiculos(placa: string): Observable<VehiculoBuscado[]> {
    return this.http.get<VehiculoBuscado[]>(`${this.apiUrl}/vehiculos/search?placa=${placa}`);
  }

  activarGps(placa: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/vehiculos/activar-gps`, { placa });
  }
}
