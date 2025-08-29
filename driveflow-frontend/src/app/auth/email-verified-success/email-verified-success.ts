// src/app/auth/email-verified-success/email-verified-success.component.ts

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Necesario para directivas comunes como ngIf, ngFor, etc.
import { RouterLink } from '@angular/router'; // Necesario para la directiva routerLink

import { MatFormFieldModule } from '@angular/material/form-field'; // Para el contenedor del input
import { MatInputModule } from '@angular/material/input';         // Para el input en sí
import { MatButtonModule } from '@angular/material/button';       // Para los botones
import { MatCardModule } from '@angular/material/card'; 

@Component({
  selector: 'app-email-verified-success',
  standalone: true, // Indica que es un componente standalone
  imports: [CommonModule, 
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule // Si decides usar MatCard para tarjeta login
  ], // Importa módulos necesarios directamente aquí
  templateUrl: './email-verified-success.html', // Nombre de archivo correcto
  styleUrl: './email-verified-success.css' // Nombre de archivo correcto
})
export class EmailVerifiedSuccessComponent { // <-- CAMBIO AQUÍ: Añade 'Component' al nombre de la clase
  constructor() { } // Constructor vacío si no necesitas inicializar nada
}