
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardEmpresaClientesService, Cliente } from './dashboard-empresa-clientes.service';

@Component({
  selector: 'app-dashboard-empresa-clientes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-empresa-clientes.html',
  styleUrls: ['./dashboard-empresa-clientes.css']
})
export class DashboardEmpresaClientesComponent implements OnInit {
  clientes: Cliente[] = [];
  loading = true;
  error: string | null = null;

  constructor(private clientesService: DashboardEmpresaClientesService) {}

  ngOnInit() {
    this.clientesService.getClientes().subscribe({
      next: (data) => {
        this.clientes = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar los clientes';
        this.loading = false;
      }
    });
  }

  getStatusColor(cliente: Cliente): string {
    const today = new Date();
    const soatDate = new Date(cliente.fecha_soat);
    const tecnoDate = new Date(cliente.fecha_tecno);
    
    const soatDaysLeft = Math.ceil((soatDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    const tecnoDaysLeft = Math.ceil((tecnoDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    if (soatDaysLeft < 0 || tecnoDaysLeft < 0) return 'dot-red'; // Vencido
    if (soatDaysLeft < 30 || tecnoDaysLeft < 30) return 'dot-orange'; // Por vencer
    return 'dot-green'; // Vigente
  }

  getStatusTooltip(cliente: Cliente): string {
    const today = new Date();
    const soatDate = new Date(cliente.fecha_soat);
    const tecnoDate = new Date(cliente.fecha_tecno);
    
    const soatDaysLeft = Math.ceil((soatDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    const tecnoDaysLeft = Math.ceil((tecnoDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    if (soatDaysLeft < 0 && tecnoDaysLeft < 0) {
      return 'VENCIDO - SOAT y Tecnomecánica vencidos';
    } else if (soatDaysLeft < 0) {
      return 'VENCIDO - SOAT vencido';
    } else if (tecnoDaysLeft < 0) {
      return 'VENCIDO - Tecnomecánica vencida';
    } else if (soatDaysLeft < 30 && tecnoDaysLeft < 30) {
      return `POR VENCER - SOAT en ${soatDaysLeft} días, Tecnomecánica en ${tecnoDaysLeft} días`;
    } else if (soatDaysLeft < 30) {
      return `POR VENCER - SOAT en ${soatDaysLeft} días`;
    } else if (tecnoDaysLeft < 30) {
      return `POR VENCER - Tecnomecánica en ${tecnoDaysLeft} días`;
    } else {
      return 'VIGENTE - Todos los documentos al día';
    }
  }
}
