import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Cliente {
  nombre: string;
  identificacion: string;
  celular: string;
  placa: string;
  modelo: string;
  color: string;
  fecha_soat: string;
  fecha_tecno: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardEmpresaClientesService {
  private apiUrl = 'http://localhost:8000/auth/empresa/clientes'; // Ajusta la URL según tu backend

  constructor(private http: HttpClient) {}

  getClientes(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(this.apiUrl);
  }
}
