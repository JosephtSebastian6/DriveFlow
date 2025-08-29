
import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardEmpresaAgentesService, Agente } from '../dashboard-empresa-agentes/dashboard-empresa-agentes.service';

@Component({
  selector: 'app-dashboard-gps',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrls: ['./dashboard-gps.css'],
  templateUrl: './dashboard-gps.html',
})
export class DashboardGpsComponent implements OnInit, AfterViewInit {
  showApagarVehiculo = false;
  agentes: Agente[] = [];
  filteredAgentes: Agente[] = [];
  searchTerm = '';

  constructor(private agentesService: DashboardEmpresaAgentesService) {}

  ngOnInit(): void {
    // Mostrar el botón solo si el usuario es funcionario o empresa
    const tipo = localStorage.getItem('tipo_usuario');
    this.showApagarVehiculo = tipo === 'funcionario' || tipo === 'empresa';
    
    // Cargar los agentes (funcionarios)
    this.loadAgentes();
  }

  ngAfterViewInit(): void {
    // Cargar Leaflet solo si no está ya cargado
    if (!(window as any).L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => this.initMap();
      document.body.appendChild(script);
    } else {
      this.initMap();
    }
  }

  initMap() {
    const L = (window as any).L;
    if (!L) return;
    const map = L.map('map').setView([4.7110, -74.0721], 13); // Bogotá por defecto
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);
    L.marker([4.7110, -74.0721]).addTo(map)
      .bindPopup('Ubicación de ejemplo (Bogotá)').openPopup();
  }

  loadAgentes(): void {
    this.agentesService.getAgentes().subscribe({
      next: (agentes) => {
        this.agentes = agentes;
        this.filteredAgentes = agentes;
      },
      error: (error) => {
        console.error('Error al cargar agentes:', error);
      }
    });
  }

  onSearch(event: any): void {
    this.searchTerm = event.target.value.toLowerCase();
    this.filteredAgentes = this.agentes.filter(agente => 
      agente.placa.toLowerCase().includes(this.searchTerm) ||
      agente.nombre.toLowerCase().includes(this.searchTerm)
    );
  }

  getStatusColor(agente: Agente): string {
    // Lógica para determinar el color del estado basado en fechas SOAT/Tecno
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
