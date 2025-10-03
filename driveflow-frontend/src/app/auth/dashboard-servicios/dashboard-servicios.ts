import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-servicios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-servicios.html',
  styleUrls: ['./dashboard-servicios.css']
})
export class DashboardServiciosComponent {
  servicios = [
    {
      icon: 'gps_fixed',
      titulo: 'Monitoreo GPS',
      desc: 'Ubicación en tiempo real, historial de recorridos y zonas seguras.'
    },
    {
      icon: 'security',
      titulo: 'Recuperación Vehicular',
      desc: 'Protocolos de reacción y apoyo coordinado para la recuperación.'
    },
    {
      icon: 'notifications_active',
      titulo: 'Alertas Inteligentes',
      desc: 'Notificaciones por encendido, remolque, batería baja y más.'
    },
    {
      icon: 'build',
      titulo: 'Instalación y Soporte',
      desc: 'Instalación profesional y soporte técnico 24/7.'
    },
    {
      icon: 'payments',
      titulo: 'Planes Flexibles',
      desc: 'Mensual o anual con descuentos por volumen.'
    },
    {
      icon: 'insights',
      titulo: 'Reportes',
      desc: 'Indicadores y reportes de uso para la gestión de flotas.'
    }
  ];

  // Moneda seleccionada para mostrar precios
  selectedCurrency: 'USD' | 'COP' = 'COP';
  // Tasa estática inicial (puedes ajustar o traer del backend luego)
  copRate = 4000; // 1 USD ≈ 4000 COP

  price(p: { precio: number }): number {
    return this.selectedCurrency === 'COP' ? Math.round(p.precio * this.copRate) : p.precio;
  }

  planes = [
    {
      id: 'basic',
      nombre: 'Básico',
      precio: 9,
      moneda: 'USD',
      periodicidad: 'mes',
      features: ['3 vehículos', 'Historial 30 días', 'Soporte por email']
    },
    {
      id: 'pro',
      nombre: 'Pro',
      precio: 19,
      moneda: 'USD',
      periodicidad: 'mes',
      features: ['25 vehículos', 'Historial 6 meses', 'Soporte prioritario']
    },
    {
      id: 'enterprise',
      nombre: 'Enterprise',
      precio: 49,
      moneda: 'USD',
      periodicidad: 'mes',
      features: ['Ilimitados', 'Historial 2 años', 'SLA 99.9% y soporte 24/7']
    },
    {
      id: 'starter',
      nombre: 'Starter',
      precio: 5,
      moneda: 'USD',
      periodicidad: 'mes',
      features: ['1 vehículo', 'Historial 7 días', 'Soporte básico']
    },
    {
      id: 'familia',
      nombre: 'Familia',
      precio: 14,
      moneda: 'USD',
      periodicidad: 'mes',
      features: ['6 vehículos', 'Historial 45 días', 'Soporte por chat']
    },
    {
      id: 'flota',
      nombre: 'Flota',
      precio: 29,
      moneda: 'USD',
      periodicidad: 'mes',
      features: ['50 vehículos', 'Historial 1 año', 'Reportes avanzados']
    }
  ];

  seleccionarPlan(id: string) {
    // Placeholder: aquí podríamos redirigir a /dashboard-empresa-pagos o abrir un modal
    console.log('Plan seleccionado:', id);
  }
}
