import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, EMPTY } from 'rxjs';
import { catchError, concatMap, take } from 'rxjs/operators';

export interface Empresa {
  id: number | string;
  nombre: string;
}

export interface UsuarioEmpresaResumen {
  username: string;
  nombres: string;
  apellidos: string;
  email: string;
  tipo_usuario: string; // 'cliente' | 'funcionario'
}

@Injectable({ providedIn: 'root' })
export class EmpresasService {
  private baseUrl = 'http://localhost:8000/auth';

  constructor(private http: HttpClient) {}

  // Ajusta estas rutas según tu backend
  listEmpresas(): Observable<Empresa[]> {
    return this.http.get<Empresa[]>(`${this.baseUrl}/empresas`);
  }

  listUsuariosDeEmpresa(empresaId: number | string): Observable<UsuarioEmpresaResumen[]> {
    return this.http.get<UsuarioEmpresaResumen[]>(`${this.baseUrl}/empresas/${empresaId}/usuarios`);
  }

  validarCodigo(code: string): Observable<{ empresa_id: number | string; nombre: string } | { valid: boolean; empresa_id?: number | string; nombre?: string }> {
    return this.http.get<{ empresa_id: number | string; nombre: string } | { valid: boolean; empresa_id?: number | string; nombre?: string }>(
      `${this.baseUrl}/empresas/validar-codigo?code=${encodeURIComponent(code)}`
    );
  }

  // Gestión del código de empresa
  getCodigo(empresaId: number | string): Observable<{ codigo?: string; expira_en?: string; revocado?: boolean }> {
    const urls = [
      `${this.baseUrl}/empresas/${empresaId}/codigo`,
      `${this.baseUrl}/empresa/${empresaId}/codigo`,
      `${this.baseUrl}/empresa/${empresaId}/codigo-invitacion`,
      `${this.baseUrl}/empresas/${empresaId}/codigo-invitacion`
    ];
    return from(urls).pipe(
      concatMap((url) => this.http.get<{ codigo?: string; expira_en?: string; revocado?: boolean }>(url).pipe(catchError(() => EMPTY))),
      take(1)
    );
  }

  rotarCodigo(empresaId: number | string, expiresInDays?: number): Observable<{ codigo: string; expira_en?: string }> {
    const body: any = {};
    if (expiresInDays !== undefined) body.expires_in_days = expiresInDays;
    const urls = [
      `${this.baseUrl}/empresas/${empresaId}/codigo`,
      `${this.baseUrl}/empresa/${empresaId}/codigo`,
      `${this.baseUrl}/empresa/${empresaId}/codigo-invitacion`,
      `${this.baseUrl}/empresas/${empresaId}/codigo-invitacion`
    ];
    return from(urls).pipe(
      concatMap((url) => this.http.post<{ codigo: string; expira_en?: string }>(url, body).pipe(catchError(() => EMPTY))),
      take(1)
    );
  }

  revocarCodigo(empresaId: number | string) {
    const urls = [
      `${this.baseUrl}/empresas/${empresaId}/codigo`,
      `${this.baseUrl}/empresa/${empresaId}/codigo`,
      `${this.baseUrl}/empresa/${empresaId}/codigo-invitacion`,
      `${this.baseUrl}/empresas/${empresaId}/codigo-invitacion`
    ];
    return from(urls).pipe(
      concatMap((url) => this.http.delete(url).pipe(catchError(() => EMPTY))),
      take(1)
    );
  }
}
