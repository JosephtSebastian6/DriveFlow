import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PagosPlanesService, Plan } from '../services/pagos-planes.service';

@Component({
  selector: 'app-dashboard-pagos-planes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-pagos-planes.html',
  styleUrls: ['./dashboard-pagos-planes.css']
})
export class DashboardPagosPlanesComponent {
  planes: Plan[] = [];
  loading = true;
  error: string | null = null;

  selectedPlanId: string | null = null;
  ciclo: 'mensual' | 'anual' = 'mensual';
  currency: 'COP' | 'USD' = 'COP';

  pagoOk: { referencia: string } | null = null;
  pagoError: string | null = null;

  constructor(private svc: PagosPlanesService) {
    this.svc.listarPlanes().subscribe({
      next: (pl) => { this.planes = pl; this.loading = false; },
      error: () => { this.error = 'No fue posible cargar los planes'; this.loading = false; }
    });
  }

  precio(plan: Plan): number {
    return this.ciclo === 'mensual' ? plan.precioMensual : plan.precioAnual;
  }

  seleccionar(planId: string) {
    this.selectedPlanId = planId;
  }

  pagar() {
    if (!this.selectedPlanId) { this.pagoError = 'Selecciona un plan'; return; }
    const empresa_id = Number(localStorage.getItem('empresa_id') || '0') || null;
    this.pagoOk = null; this.pagoError = null;
    this.svc.crearPago({ planId: this.selectedPlanId, ciclo: this.ciclo, empresa_id, currency: this.currency })
      .subscribe({
        next: (r) => { if (r.ok) this.pagoOk = { referencia: r.referencia }; else this.pagoError = 'Pago rechazado'; },
        error: () => this.pagoError = 'Error procesando el pago'
      });
  }
}
