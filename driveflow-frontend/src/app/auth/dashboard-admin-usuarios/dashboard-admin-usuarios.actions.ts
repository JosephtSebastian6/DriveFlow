import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AdminUsuariosActionsService {
  private apiUrl = 'http://localhost:8000/auth';
  constructor(private http: HttpClient) {}

  cambiarRol(username: string, rol: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/usuarios/${username}/rol`, { rol });
  }

  setBloqueo(username: string, bloqueado: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/usuarios/${username}/bloqueo`, { bloqueado });
  }
}
