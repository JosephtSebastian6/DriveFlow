// src/app/auth/verify-email/verify-email.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Importa CommonModule para *ngIf
import { ActivatedRoute, Router } from '@angular/router'; // Para obtener el token de la URL y navegar
import { HttpClient } from '@angular/common/http'; // Para hacer la petición al backend

import { MatFormFieldModule } from '@angular/material/form-field'; // Para el contenedor del input
import { MatInputModule } from '@angular/material/input';         // Para el input en sí
import { MatButtonModule } from '@angular/material/button';       // Para los botones
import { MatCardModule } from '@angular/material/card';   

@Component({
  selector: 'app-verify-email',
  standalone: true, // Asegúrate de que esto está en true
  imports: [CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule // Si decides usar MatCard para tarjeta login
  ], // Necesario para directivas como *ngIf
  templateUrl: './verify-email.html', // ¡CORREGIDO AQUÍ! Debe apuntar a su propio HTML
  styleUrls: ['./verify-email.css'] // O .css si usas CSS
})
export class VerifyEmailComponent implements OnInit {
  verificationStatus: string = 'Verificando...';
  message: string = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    public router: Router
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        this.verifyEmail(token);
      } else {
        this.verificationStatus = 'Error de verificación';
        this.message = 'No se encontró un token de verificación.';
      }
    });
  }

  verifyEmail(token: string): void {
    // La URL de tu endpoint de verificación en FastAPI
    const backendUrl = `http://127.0.0.1:8000/auth/verify-email?token=${token}`; // Ajusta la URL si es diferente

    this.http.get(backendUrl).subscribe({
      next: (response: any) => {
        this.verificationStatus = '¡Correo verificado exitosamente!';
        this.message = response.message || 'Tu correo ha sido verificado. Ya puedes iniciar sesión.';
        // Opcional: Redirigir al usuario a la página de login después de un breve retraso
        setTimeout(() => {
          this.router.navigate(['/login']); // Asume que tendrás una ruta /login
        }, 3000);
      },
      error: (error) => {
        this.verificationStatus = 'Error de verificación';
        this.message = error.error.detail || 'Hubo un problema al verificar tu correo.';
        console.error('Error de verificación:', error);
      }
    });
  }
}