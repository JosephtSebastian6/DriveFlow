import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UsuarioResumen {
  username: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  tipo_usuario: string;
  email_verified: boolean;
  bloqueado: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminUsuariosService {
  private apiUrl = 'http://localhost:8000/auth';

  constructor(private http: HttpClient) {}

  getUsuarios(rol?: string): Observable<UsuarioResumen[]> {
    const url = rol ? `${this.apiUrl}/admin/usuarios?rol=${rol}` : `${this.apiUrl}/admin/usuarios`;
    return this.http.get<UsuarioResumen[]>(url);
  }
}
