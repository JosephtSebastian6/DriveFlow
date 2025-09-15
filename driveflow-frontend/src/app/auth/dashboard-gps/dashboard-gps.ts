
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

  // --- Estado para rutas ---
  destinationQuery = '';
  currentPos: [number, number] | null = null; // [lat, lng]
  // Paradas intermedias
  stopQuery = '';
  stops: { lat: number; lon: number; label?: string }[] = [];
  private map!: any;
  private routingControl: any | null = null;
  private L: any;

  // Resumen de ruta
  routeDistanceKm: string | null = null;
  routeDurationStr: string | null = null;
  routeEtaStr: string | null = null;

  constructor(private agentesService: DashboardEmpresaAgentesService) {}

  ngOnInit(): void {
    // Mostrar el botón solo si el usuario es funcionario o empresa
    const tipo = localStorage.getItem('tipo_usuario');
    this.showApagarVehiculo = tipo === 'funcionario' || tipo === 'empresa' || tipo === 'administrador';
    
    // Cargar los agentes (funcionarios)
    this.loadAgentes();
  }

  private formatDuration(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.round((totalSeconds % 3600) / 60);
    if (h <= 0) return `${m} min`;
    return `${h} h ${m} min`;
  }

  // --- Manejo de paradas ---
  async addStopFromQuery() {
    const q = (this.stopQuery || '').trim();
    if (!q) return;
    const coords = await this.geocode(q);
    if (!coords) {
      alert('No se pudo geocodificar la parada');
      return;
    }
    this.stops.push({ ...coords, label: q });
    this.stopQuery = '';
    if (this.map) {
      this.L.marker([coords.lat, coords.lon]).addTo(this.map).bindPopup(`Parada: ${q}`);
    }
  }

  removeStop(index: number) {
    if (index < 0 || index >= this.stops.length) return;
    this.stops.splice(index, 1);
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
      script.onload = () => {
        // Cargar Leaflet Routing Machine (script + css)
        const lrmCss = document.createElement('link');
        lrmCss.rel = 'stylesheet';
        lrmCss.href = 'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css';
        document.head.appendChild(lrmCss);
        const lrmScript = document.createElement('script');
        lrmScript.src = 'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.min.js';
        lrmScript.onload = () => this.initMap();
        document.body.appendChild(lrmScript);
      };
      document.body.appendChild(script);
    } else {
      // Asegura Routing Machine
      if (!(window as any).L?.Routing) {
        const lrmCss = document.createElement('link');
        lrmCss.rel = 'stylesheet';
        lrmCss.href = 'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css';
        document.head.appendChild(lrmCss);
        const lrmScript = document.createElement('script');
        lrmScript.src = 'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.min.js';
        lrmScript.onload = () => this.initMap();
        document.body.appendChild(lrmScript);
      } else {
        this.initMap();
      }
    }
  }

  initMap() {
    const L = (window as any).L;
    if (!L) return;
    this.L = L;
    this.map = L.map('map').setView([4.7110, -74.0721], 13); // Bogotá por defecto
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);
    L.marker([4.7110, -74.0721]).addTo(this.map)
      .bindPopup('Ubicación de ejemplo (Bogotá)').openPopup();
  }

  // --- UI acciones para rutas ---
  useMyLocation() {
    if (!navigator.geolocation) {
      alert('Geolocalización no soportada por tu navegador');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.currentPos = [pos.coords.latitude, pos.coords.longitude];
        if (this.map) {
          this.map.setView(this.currentPos, 14);
          this.L.marker(this.currentPos).addTo(this.map).bindPopup('Mi ubicación').openPopup();
        }
      },
      (err) => {
        console.error('Error geolocalización', err);
        alert('No fue posible obtener tu ubicación');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async traceRoute() {
    if (!this.destinationQuery) {
      alert('Ingresa un destino');
      return;
    }
    if (!this.currentPos) {
      // Intentar obtener ubicación actual si no está
      await new Promise<void>((resolve) => {
        this.useMyLocation();
        setTimeout(() => resolve(), 1200);
      });
      if (!this.currentPos) {
        return;
      }
    }

    const dest = await this.geocode(this.destinationQuery);
    if (!dest) {
      alert('No se pudo encontrar el destino');
      return;
    }

    // Limpiar ruta previa
    this.clearRoute();

    // Construir waypoints: origen + paradas + destino
    const waypoints = [
      this.L.latLng(this.currentPos[0], this.currentPos[1]),
      ...this.stops.map(s => this.L.latLng(s.lat, s.lon)),
      this.L.latLng(dest.lat, dest.lon)
    ];

    // Crear ruta con OSRM demo server
    this.routingControl = this.L.Routing.control({
      waypoints,
      routeWhileDragging: true,
      show: false,
      addWaypoints: false,
      collapsible: true,
      lineOptions: { styles: [{ color: '#1976d2', weight: 6, opacity: 0.9 }] },
      router: this.L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' })
    }).addTo(this.map);

    // Al encontrar rutas, calcular distancia/tiempo y ETA
    this.routingControl.on('routesfound', (e: any) => {
      if (!e || !e.routes || e.routes.length === 0) return;
      const r = e.routes[0];
      const distKm = r.summary.totalDistance / 1000;
      const durSec = r.summary.totalTime; // en segundos
      this.routeDistanceKm = distKm.toFixed(1);
      this.routeDurationStr = this.formatDuration(durSec);
      const eta = new Date(Date.now() + durSec * 1000);
      this.routeEtaStr = `${eta.getHours().toString().padStart(2,'0')}:${eta.getMinutes().toString().padStart(2,'0')}`;
    });

    this.map.fitBounds(this.L.latLngBounds(waypoints), { padding: [40, 40] });
  }

  clearRoute() {
    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
      this.routingControl = null;
    }
    this.routeDistanceKm = null;
    this.routeDurationStr = null;
    this.routeEtaStr = null;
  }

  private async geocode(query: string): Promise<{ lat: number; lon: number } | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      }
      return null;
    } catch (e) {
      console.error('Error geocoding', e);
      return null;
    }
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
