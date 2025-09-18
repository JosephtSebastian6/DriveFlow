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
}
