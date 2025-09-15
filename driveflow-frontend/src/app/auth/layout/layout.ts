import { Component, ViewEncapsulation } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css'],
  encapsulation: ViewEncapsulation.None
})
export class LayoutComponent {
  // Forzamos a string para evitar literales estrechos en el template
  tipoUsuario: string = localStorage.getItem('tipo_usuario') || '';

  isAdmin(): boolean { return this.tipoUsuario === 'administrador'; }
  canSeeClienteVehiculo(): boolean {
    const t = this.tipoUsuario;
    // Administrador NO ve "Mi Vehículo"
    return t === 'cliente' || t === 'funcionario';
  }
  canSeeEmpresaBlocks(): boolean {
    const t = this.tipoUsuario;
    return t === 'empresa' || t === 'administrador';
  }
  showPerfil(): boolean {
    const t = this.tipoUsuario;
    // Administrador NO ve "Mi Perfil"
    return t === 'cliente' || t === 'funcionario';
  }
}
