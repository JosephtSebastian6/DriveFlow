import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http'; // Importa HttpErrorResponse

import { MatFormFieldModule } from '@angular/material/form-field'; // Para el contenedor del input
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';         // Para el input en sí
import { MatButtonModule } from '@angular/material/button';       // Para los botones
import { MatCardModule } from '@angular/material/card';   

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatOptionModule
  ],
  templateUrl: './register.html', // O './register.component.html' si lo renombraste
  styleUrls: ['./register.css'] // O './register.component.css' / .scss
})
export class RegisterComponent implements OnInit {
  username: string = '';
  email: string = '';
  password: string = '';
  nombres: string = '';
  apellidos: string = '';
  tipo_usuario: string = 'cliente'; // Valor por defecto
  message: string = '';

  constructor(private http: HttpClient, private router: Router) {
    console.log('¡¡DEBUG: RegisterComponent: Constructor llamado!!'); // <-- Añade este log
  }

  ngOnInit(): void {
    console.log('¡¡DEBUG: RegisterComponent: ngOnInit llamado!!'); // <-- Añade este log
  }

  onSubmit(): void {
    console.log('¡¡DEBUG: RegisterComponent: onSubmit llamado!!'); // <-- Añade este log (al inicio)

    const userData = {
      username: this.username,
      email: this.email,
      password: this.password,
      nombres: this.nombres,
      apellidos: this.apellidos,
      tipo_usuario: this.tipo_usuario
    };

    console.log('¡¡DEBUG: Datos de usuario a enviar:', userData);

    this.http.post('http://127.0.0.1:8000/auth/register', userData)
      .subscribe({
        next: (response: any) => { // Añadí ': any' para claridad de tipos
          this.message = '¡Registro exitoso! Por favor, verifica tu correo electrónico.';
          console.log('¡¡DEBUG: La petición se envió y fue exitosa:', response);
          this.router.navigate(['/registration-success']);
        },
        error: (error: HttpErrorResponse) => { // Añadí ': HttpErrorResponse'
          console.error('¡¡DEBUG: RegisterComponent: Error en la suscripción:', error); // Log completo del error

          let errorMessage = 'Error desconocido en el registro.';
          if (error.error && error.error.detail) {
            errorMessage = 'Error en el registro: ' + error.error.detail;
          } else if (error.message) {
            errorMessage = 'Error de red o HTTP: ' + error.message;
          } else if (typeof error.error === 'string') {
            errorMessage = 'Error del servidor: ' + error.error;
          }
          this.message = errorMessage;
        }
      });
  }
}