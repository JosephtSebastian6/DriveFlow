import { Component, ViewEncapsulation, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AlertsService, AlertItem } from '../services/alerts.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css'],
  encapsulation: ViewEncapsulation.None
})
export class LayoutComponent implements OnInit, OnDestroy {
  // Forzamos a string para evitar literales estrechos en el template
  tipoUsuario: string = localStorage.getItem('tipo_usuario') || '';
  // Alertas in-app
  alerts: AlertItem[] = [];
  showAlerts = false;
  private pollHandle: any = null;
  private lastTs: number = 0;

  constructor(private alertsSvc: AlertsService) {}

  // Vistas/menú existentes
  isAdmin(): boolean { return this.tipoUsuario === 'administrador'; }
  canSeeClienteVehiculo(): boolean {
    const t = this.tipoUsuario;
    // Mostrar para cliente, funcionario, empresa, pime y administrador
    return t === 'cliente' || t === 'funcionario' || t === 'empresa' || t === 'pime' || t === 'administrador';
  }
  canSeeEmpresaBlocks(): boolean {
    const t = this.tipoUsuario;
    return t === 'empresa' || t === 'administrador' || t === 'pime';
  }
  showPerfil(): boolean {
    const t = this.tipoUsuario;
    // Administrador NO ve "Mi Perfil"
    return t === 'cliente' || t === 'funcionario';
  }

  ngOnInit(): void {
    // Solo empresa o funcionario ven el banner de alertas
    if (this.tipoUsuario === 'empresa' || this.tipoUsuario === 'funcionario') {
      this.startAlertsPolling();
    }
  }

  ngOnDestroy(): void {
    if (this.pollHandle) clearInterval(this.pollHandle);
  }

  private startAlertsPolling() {
    // Primera carga inmediata
    this.fetchAlerts();
    // Polling cada 20s
    this.pollHandle = setInterval(() => this.fetchAlerts(), 20000);
  }

  private fetchAlerts() {
    this.alertsSvc.obtenerAlertas(this.lastTs || undefined, 30).subscribe({
      next: (res: { now_ms: number; items: AlertItem[] }) => {
        const items = res?.items || [];
        if (items.length > 0) {
          // Agregar al principio (más recientes arriba)
          const sorted = [...items].sort((a: AlertItem, b: AlertItem) => b.ts_ms - a.ts_ms);
          this.alerts = [...sorted, ...this.alerts];
          this.showAlerts = true;
          // Actualizar lastTs al mayor ts
          const maxTs = Math.max(...items.map((i: AlertItem) => i.ts_ms));
          if (isFinite(maxTs)) this.lastTs = maxTs;
        }
      },
      error: () => {}
    });
  }

  dismissAlerts() { this.showAlerts = false; }
}
