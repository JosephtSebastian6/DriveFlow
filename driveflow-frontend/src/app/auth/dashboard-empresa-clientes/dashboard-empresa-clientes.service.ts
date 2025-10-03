import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, switchMap, map, forkJoin } from 'rxjs';
import { EmpresasService, UsuarioEmpresaResumen } from '../services/empresas.service';

export interface Cliente {
  nombre: string;
  identificacion: string;
  celular: string;
  placa: string;
  modelo: string;
  color: string;
  fecha_soat: string;
  fecha_tecno: string;
  origen?: 'asignado' | 'propio' | string;
  tipo_usuario?: 'cliente' | 'funcionario' | 'pime' | string;
}

@Injectable({ providedIn: 'root' })
export class DashboardEmpresaClientesService {
  private apiUrl = 'http://localhost:8000/auth/empresa/clientes'; // Ajusta la URL según tu backend

  constructor(private http: HttpClient, private empresasSvc: EmpresasService) {}

  getClientes(): Observable<Cliente[]> {
    const empresaIdCached = localStorage.getItem('empresa_id');
    if (empresaIdCached) {
      return this.http.get<Cliente[]>(`${this.apiUrl}?empresa_id=${empresaIdCached}&incluir_funcionarios=true`).pipe(
        map((list) => this.normalizeRows(list)),
        switchMap((list) => {
          if (Array.isArray(list) && list.length > 0) return of(list);
          // Fallback: componer desde usuarios de la empresa
          return this.composeFromUsuarios(String(empresaIdCached));
        })
      );
    }
    const username = localStorage.getItem('username');
    if (!username) return of([]);
    // Resolver empresa_id correctamente a partir del username
    return this.http.get<{ empresa_id: number | null }>(`http://localhost:8000/auth/empresa/id-por-username?username=${encodeURIComponent(username)}`).pipe(
      switchMap((res) => {
        const id = res?.empresa_id;
        if (id) {
          localStorage.setItem('empresa_id', String(id));
          return this.http.get<Cliente[]>(`${this.apiUrl}?empresa_id=${id}&incluir_funcionarios=true`).pipe(
            map((list) => this.normalizeRows(list)),
            switchMap((list) => {
              if (Array.isArray(list) && list.length > 0) return of(list);
              return this.composeFromUsuarios(String(id));
            })
          );
        }
        return of([]);
      })
    );
  }

  private composeFromUsuarios(empresaId: string): Observable<Cliente[]> {
    // 1) listar usuarios vinculados a la empresa
    return this.empresasSvc.listUsuariosDeEmpresa(empresaId).pipe(
      switchMap((usuarios: UsuarioEmpresaResumen[]) => {
        if (!Array.isArray(usuarios) || usuarios.length === 0) return of<Cliente[]>([]);
        // Solo clientes para este dashboard
        const clientes = usuarios.filter(u => (u.tipo_usuario || '').toLowerCase() === 'cliente');
        if (clientes.length === 0) return of<Cliente[]>([]);
        const calls = clientes.map(u =>
          this.http.get<any[]>(`http://localhost:8000/auth/usuarios/${encodeURIComponent(u.username)}/vehiculos`).pipe(
            map((vehiculos) => ({ usuario: u, vehiculos: Array.isArray(vehiculos) ? vehiculos : [] }))
          )
        );
        return forkJoin(calls).pipe(
          map((packs) => {
            const rows: Cliente[] = [];
            for (const p of packs) {
              for (const v of p.vehiculos) {
                rows.push({
                  nombre: `${p.usuario.nombres || ''} ${p.usuario.apellidos || ''}`.trim(),
                  identificacion: (v.numero_identificacion || v.identificacion || '') + '',
                  celular: v.telefono || '',
                  placa: v.placa || '',
                  modelo: v.modelo || '',
                  color: v.color || '',
                  fecha_soat: v.fecha_soat || '',
                  fecha_tecno: v.fecha_tecno || '',
                  // En fallback (solo clientes) todo lo que venga de /usuarios/{username}/vehiculos es 'propio'
                  origen: 'propio',
                  tipo_usuario: 'cliente'
                });
              }
            }
            return this.normalizeRows(rows);
          })
        );
      })
    );
  }

  private normalizeRows(rows: any): Cliente[] {
    const list = Array.isArray(rows) ? rows : [];
    return list.map((r: any) => {
      const origen = (r.origen || '').toString().toLowerCase();
      let tipo = (r.tipo_usuario || '').toString().toLowerCase();
      if (tipo !== 'cliente' && tipo !== 'funcionario' && tipo !== 'pime') {
        // Inferir tipo por origen si no viene del backend
        tipo = origen === 'asignado' ? 'funcionario' : 'cliente';
      }
      return {
        nombre: r.nombre || '',
        identificacion: r.identificacion || '',
        celular: r.celular || '',
        placa: r.placa || '',
        modelo: r.modelo || '',
        color: r.color || '',
        fecha_soat: r.fecha_soat || '',
        fecha_tecno: r.fecha_tecno || '',
        origen: origen || undefined,
        tipo_usuario: tipo
      } as Cliente;
    });
  }
}
