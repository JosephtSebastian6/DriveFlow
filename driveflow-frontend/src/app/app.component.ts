import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { AuthService } from './auth/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root', // Este es el selector que se usa en index.html
  standalone: true, // ¡IMPORTANTE! Indica que es un componente independiente
  imports: [CommonModule, RouterOutlet, RouterLink], // Importa los módulos necesarios
  templateUrl: './app.html', // Ruta a su propia plantilla HTML
  styleUrls: ['./app.css'] // Ruta a sus propios estilos CSS/SCSS
})
export class AppComponent {
  title = 'DriveFlow App'; // Puedes cambiar el título de tu aplicación aquí
  isLoggedIn = false;
  private authSub: Subscription | undefined;

  // Simulación: aquí deberías consultar el estado real de autenticación (token, servicio, etc)
  ngOnInit() {
    this.authSub = this.authService.isLoggedIn$.subscribe(val => {
      this.isLoggedIn = val;
    });
  }

  logout() {
    this.authService.logout();
    window.location.href = '/login';
  }
  constructor(public authService: AuthService) {}
  ngOnDestroy() {
    this.authSub?.unsubscribe();
  }
}