import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from './auth/auth.service';
import { AlertsService } from './auth/services/alerts.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root', // Este es el selector que se usa en index.html
  standalone: true, // ¡IMPORTANTE! Indica que es un componente independiente
  imports: [CommonModule, RouterOutlet, RouterLink, FormsModule], // Importa los módulos necesarios
  templateUrl: './app.html', // Ruta a su propia plantilla HTML
  styleUrls: ['./app.css'] // Ruta a sus propios estilos CSS/SCSS
})
export class AppComponent {
  title = 'DriveFlow App'; // Puedes cambiar el título de tu aplicación aquí
  isLoggedIn = false;
  // Número de la línea de reacción (formato E.164 recomendado). Cambia este valor según tu operación.
  reactionPhone: string = '+573153164146';
  private authSub: Subscription | undefined;
  // Estado del modal de confirmación
  reactionConfirmOpen = false;
  reactionMessage = '';

  // Simulación: aquí deberías consultar el estado real de autenticación (token, servicio, etc)
  ngOnInit() {
    this.authSub = this.authService.isLoggedIn$.subscribe(val => {
      this.isLoggedIn = val;
    });
  }

  openReactionConfirm() { this.reactionConfirmOpen = true; }
  closeReactionConfirm() { this.reactionConfirmOpen = false; this.reactionMessage = ''; }

  // Solo enviar alerta
  async sendAlertOnly() {
    try {
      const origin = localStorage.getItem('username') || 'anon';
      const msg = this.reactionMessage?.trim() || 'Línea de Reacción activada';
      await this.alerts.crearAlertaLineaReaccion(origin, msg).toPromise();
    } finally {
      this.closeReactionConfirm();
    }
  }

  // Enviar alerta y llamar
  async sendAlertAndCall() {
    try {
      const origin = localStorage.getItem('username') || 'anon';
      const msg = this.reactionMessage?.trim() || 'Línea de Reacción activada';
      await this.alerts.crearAlertaLineaReaccion(origin, msg).toPromise();
    } finally {
      this.closeReactionConfirm();
      window.location.href = `tel:${this.reactionPhone}`;
    }
  }

  logout() {
    this.authService.logout();
    window.location.href = '/login';
  }
  constructor(public authService: AuthService, private alerts: AlertsService) {}
  ngOnDestroy() {
    this.authSub?.unsubscribe();
  }
}