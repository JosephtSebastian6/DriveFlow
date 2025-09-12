import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Importa CommonModule para directivas comunes
import { RouterLink } from '@angular/router'; // Importa RouterLink si vas a tener enlaces en el dashboard


import { MatButtonModule } from '@angular/material/button';       // Para los botones



@Component({
  selector: 'app-home',
  standalone: true, // Por defecto en Angular 17+
  imports: [CommonModule, 
    RouterLink,
   
    MatButtonModule,
     // Si decides usar MatCard para tarjeta login
  ], // Añade CommonModule y RouterLink
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnInit {
  // Número de WhatsApp sin el signo '+' y en formato internacional (E.164 sin '+').
  // Cambia este valor según tu operación.
  whatsappPhone = '573153164146';
  // Mensaje inicial que se abrirá en WhatsApp.
  whatsappMessage = 'Hola, necesito asistencia inmediata para mi vehículo.';

  constructor() { }

  ngOnInit(): void {
  }

  whatsappLink(): string {
    const base = 'https://wa.me/';
    const text = encodeURIComponent(this.whatsappMessage);
    return `${base}${this.whatsappPhone}?text=${text}`;
  }

}