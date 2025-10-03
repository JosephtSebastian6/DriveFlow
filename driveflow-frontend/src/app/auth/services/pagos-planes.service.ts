import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map } from 'rxjs';

export interface Plan {
  id: string;
  nombre: string;
  descripcion?: string;
  precioMensual: number; // en USD o COP, defínelo según tu backend
  precioAnual: number;   // precio con descuento por anualidad
  caracteristicas: string[];
}

export interface IntentoPago {
  planId: string;
  ciclo: 'mensual' | 'anual';
  empresa_id?: number | null;
  currency?: 'COP' | 'USD';
}

@Injectable({ providedIn: 'root' })
export class PagosPlanesService {
  private apiBase = 'http://localhost:8000/pagos'; // TODO: ajustar cuando exista backend real

  constructor(private http: HttpClient) {}

  // Stub inicial: retorna lista de planes local
  listarPlanes(): Observable<Plan[]> {
    const planes: Plan[] = [
      {
        id: 'basic',
        nombre: 'Básico',
        descripcion: 'Ideal para empezar',
        precioMensual: 9,
        precioAnual: 90,
        caracteristicas: [
          'Hasta 3 vehículos',
          'Historial 30 días',
          'Soporte por email'
        ]
      },
      {
        id: 'pro',
        nombre: 'Pro',
        descripcion: 'Para empresas en crecimiento',
        precioMensual: 19,
        precioAnual: 190,
        caracteristicas: [
          'Hasta 25 vehículos',
          'Historial 6 meses',
          'Soporte prioritario'
        ]
      },
      {
        id: 'enterprise',
        nombre: 'Enterprise',
        descripcion: 'Alto volumen y SLA',
        precioMensual: 49,
        precioAnual: 490,
        caracteristicas: [
          'Vehículos ilimitados',
          'Historial 2 años',
          'SLA 99.9% y soporte 24/7'
        ]
      }
    ];
    return of(planes).pipe(delay(200));
  }

  // Stub de intento de pago (simula éxito)
  crearPago(intent: IntentoPago): Observable<{ ok: boolean; referencia: string }> {
    // En el futuro: POST `${this.apiBase}/crear-intento` con intent
    return of({ ok: true, referencia: 'PAY-' + Math.random().toString(36).slice(2, 10).toUpperCase() }).pipe(delay(600));
  }
}
