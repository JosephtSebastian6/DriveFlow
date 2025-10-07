import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http'; // Importa HttpErrorResponse
import { EmpresasService } from '../services/empresas.service';

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
  // Código de empresa opcional para asociar el usuario durante el registro
  empresa_code: string = '';
  empresaNombre?: string;
  empresaValida: boolean | null = null; // null = sin validar, true válido, false inválido
  validandoEmpresa = false;
  message: string = '';

  constructor(private http: HttpClient, private router: Router, private route: ActivatedRoute, private empresas: EmpresasService) {
    console.log('¡¡DEBUG: RegisterComponent: Constructor llamado!!'); // <-- Añade este log
  }

  ngOnInit(): void {
    console.log('¡¡DEBUG: RegisterComponent: ngOnInit llamado!!'); // <-- Añade este log
    // Prefill de código de empresa si viene por query param, ej: /register?empresa=ABC123
    this.route.queryParamMap.subscribe((params) => {
      const code = params.get('empresa') || params.get('empresa_code') || params.get('company') || '';
      if (code) {
        this.empresa_code = code;
        this.validarCodigoEmpresa();
      }
    });
  }

  onEmpresaCodeInput() {
    // Reiniciamos el estado de validación mientras el usuario escribe
    if (!this.empresa_code) {
      this.empresaValida = null;
      this.empresaNombre = undefined;
      return;
    }
    this.empresaValida = null;
    this.empresaNombre = undefined;
  }

  onSubmit(): void {
    console.log('¡¡DEBUG: RegisterComponent: onSubmit llamado!!'); // <-- Añade este log (al inicio)

    // Si el usuario ingresó un código de empresa, validarlo antes de enviar
    if (this.empresa_code && this.empresaValida === false) {
      this.message = 'Código de empresa inválido. Por favor verifica el código.';
      return;
    }

    const userData = {
      username: this.username,
      email: this.email,
      password: this.password,
      nombres: this.nombres,
      apellidos: this.apellidos,
      // No enviamos tipo_usuario desde el frontend; backend lo fija a 'cliente'
      ...(this.empresa_code ? { empresa_code: this.empresa_code } : {})
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

  validarCodigoEmpresa() {
    const code = (this.empresa_code || '').trim();
    if (!code) {
      this.empresaValida = null;
      this.empresaNombre = undefined;
      return;
    }
    this.validandoEmpresa = true;
    this.empresas.validarCodigo(code).subscribe({
      next: (res: any) => {
        // Soportamos dos posibles respuestas: {empresa_id, nombre} o {valid: boolean}
        if (res && (res.empresa_id || res.valid === true)) {
          this.empresaValida = true;
          this.empresaNombre = res.nombre || this.empresaNombre;
        } else {
          this.empresaValida = false;
          this.empresaNombre = undefined;
        }
        this.validandoEmpresa = false;
      },
      error: () => {
        this.empresaValida = false;
        this.empresaNombre = undefined;
        this.validandoEmpresa = false;
      }
    });
  }
}