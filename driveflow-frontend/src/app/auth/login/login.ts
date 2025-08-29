import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  // Asegúrate de que FormsModule esté en imports
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  // Propiedades para enlazar con los campos del formulario
  username: string = '';
  password: string = '';
  // Propiedad para mostrar mensajes al usuario
  message: string = '';

  // Inyecta el Router y el HttpClient para hacer peticiones
  constructor(private http: HttpClient, private router: Router, private authService: AuthService) {}

  onSubmit(): void {
    const userData = {
      username: this.username,
      password: this.password
    };

    // Realiza la petición POST al backend
    this.http.post('http://localhost:8000/auth/login', userData)
      .subscribe({
        next: (response: any) => {
          this.message = 'Inicio de sesión exitoso.';
          if (response.access_token) {
            this.authService.login(response.access_token);
          }
          if (userData.username) {
            localStorage.setItem('username', userData.username);
          }
          // Guarda el tipo de usuario en localStorage
          if (response.tipo_usuario) {
            localStorage.setItem('tipo_usuario', response.tipo_usuario);
          }
          // Redirige según el tipo de usuario
          if (response.tipo_usuario === 'cliente') {
            this.router.navigate(['/dashboard-cliente']);
          } else if (response.tipo_usuario === 'empresa') {
            this.router.navigate(['/dashboard-empresa']);
          } else if (response.tipo_usuario === 'funcionario') {
            this.router.navigate(['/dashboard-funcionario']);
          } else {
            this.router.navigate(['/dashboard']); // Fallback
          }
        },
        error: (error) => {
          this.message = 'Error al iniciar sesión. Por favor, revisa tus credenciales.';
          console.error('Login error:', error);
        }
      });
  }
}
