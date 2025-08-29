import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardEmpresaAgentesService, Agente } from './dashboard-empresa-agentes.service';

@Component({
  selector: 'app-dashboard-empresa-agentes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-empresa-agentes.html',
  styleUrls: ['./dashboard-empresa-agentes.css']
})
export class DashboardEmpresaAgentes implements OnInit {
  agentes: Agente[] = [];
  loading = true;
  error: string | null = null;

  constructor(private agentesService: DashboardEmpresaAgentesService) {}

  ngOnInit() {
    this.agentesService.getAgentes().subscribe({
      next: (data) => {
        this.agentes = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar los agentes';
        this.loading = false;
      }
    });
  }

  getStatusColor(agente: Agente): string {
    const today = new Date();
    const soatDate = new Date(agente.fecha_soat);
    const tecnoDate = new Date(agente.fecha_tecno);
    
    const soatDaysLeft = Math.ceil((soatDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    const tecnoDaysLeft = Math.ceil((tecnoDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    if (soatDaysLeft < 0 || tecnoDaysLeft < 0) return 'dot-red'; // Vencido
    if (soatDaysLeft < 30 || tecnoDaysLeft < 30) return 'dot-orange'; // Por vencer
    return 'dot-green'; // Vigente
  }

  getStatusTooltip(agente: Agente): string {
    const today = new Date();
    const soatDate = new Date(agente.fecha_soat);
    const tecnoDate = new Date(agente.fecha_tecno);
    
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
