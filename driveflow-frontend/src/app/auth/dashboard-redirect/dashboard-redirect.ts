import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-redirect',
  standalone: true,
  template: ''
})
export class DashboardRedirectComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {
    const tipo = (localStorage.getItem('tipo_usuario') || '').toLowerCase();
    // Redirección por rol al entrar a /dashboard
    switch (tipo) {
      case 'administrador':
        this.router.navigateByUrl('/dashboard-admin-usuarios');
        break;
      case 'empresa':
      case 'pime':
        this.router.navigateByUrl('/dashboard-empresa-clientes');
        break;
      case 'funcionario':
        this.router.navigateByUrl('/dashboard-gps');
        break;
      case 'cliente':
        this.router.navigateByUrl('/dashboard-cliente');
        break;
      default:
        this.router.navigateByUrl('/dashboard-gps');
        break;
    }
  }
}
