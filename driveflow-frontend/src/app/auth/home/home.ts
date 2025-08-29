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
  styleUrl: './home.css'
})
export class HomeComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}