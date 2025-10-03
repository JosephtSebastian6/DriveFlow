import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, switchMap } from 'rxjs';

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

  private resolveEmpresaId(): Observable<string | null> {
    const cached = localStorage.getItem('empresa_id');
    if (cached) return of(cached);
    const username = localStorage.getItem('username');
    if (!username) return of(null);
    return this.http.get<any>(`${this.apiUrl}/perfil/${username}`).pipe(
      switchMap((perfil) => {
        const id = perfil?.identificador ? String(perfil.identificador) : null;
        if (id) localStorage.setItem('empresa_id', id);
        return of(id);
      })
    );
  }

  getVehiculosActivos(): Observable<VehiculoBuscado[]> {
    return this.resolveEmpresaId().pipe(
      switchMap((id) => id ? this.http.get<VehiculoBuscado[]>(`${this.apiUrl}/vehiculos/activos?empresa_id=${id}`) : of([]))
    );
  }

  getVehiculosInactivos(): Observable<VehiculoBuscado[]> {
    return this.resolveEmpresaId().pipe(
      switchMap((id) => id ? this.http.get<VehiculoBuscado[]>(`${this.apiUrl}/vehiculos/inactivos?empresa_id=${id}`) : of([]))
    );
  }

  constructor(private http: HttpClient) { }

  searchVehiculos(placa: string): Observable<VehiculoBuscado[]> {
    return this.resolveEmpresaId().pipe(
      switchMap((id) => id ? this.http.get<VehiculoBuscado[]>(`${this.apiUrl}/vehiculos/search?placa=${encodeURIComponent(placa)}&empresa_id=${id}`) : of([]))
    );
  }

  activarGps(placa: string): Observable<any> {
    return this.resolveEmpresaId().pipe(
      switchMap((id) => id ? this.http.post(`${this.apiUrl}/vehiculos/activar-gps`, { placa, empresa_id: Number(id) }) : of({}))
    );
  }

  desactivarGps(placa: string): Observable<any> {
    return this.resolveEmpresaId().pipe(
      switchMap((id) => id ? this.http.post(`${this.apiUrl}/vehiculos/desactivar-gps`, { placa, empresa_id: Number(id) }) : of({}))
    );
  }
}
