import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Agente {
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
export class DashboardEmpresaAgentesService {
  private apiUrl = 'http://localhost:8000/auth/empresa/agentes';

  constructor(private http: HttpClient) {}

  getAgentes(): Observable<Agente[]> {
    return this.http.get<Agente[]>(this.apiUrl);
  }
}
