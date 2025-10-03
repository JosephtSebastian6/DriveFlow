import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AlertItem {
  ts_ms: number;
  origin?: string | null;
  message?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AlertsService {
  private baseUrl = 'http://localhost:8000/auth';
  constructor(private http: HttpClient) {}

  crearAlertaLineaReaccion(origin?: string, message?: string): Observable<{ created: boolean; ts_ms: number }> {
    return this.http.post<{ created: boolean; ts_ms: number }>(`${this.baseUrl}/alertas/linea-reaccion`, { origin, message });
  }

  obtenerAlertas(since_ms?: number, window_minutes: number = 10): Observable<{ now_ms: number; items: AlertItem[] }> {
    const params: string[] = [];
    if (since_ms != null) params.push(`since_ms=${since_ms}`);
    if (window_minutes != null) params.push(`window_minutes=${window_minutes}`);
    const q = params.length ? `?${params.join('&')}` : '';
    return this.http.get<{ now_ms: number; items: AlertItem[] }>(`${this.baseUrl}/alertas/ultimas${q}`);
  }
}
