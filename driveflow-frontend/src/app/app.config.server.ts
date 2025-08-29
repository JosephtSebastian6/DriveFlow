// src/app/app.config.server.ts
import { ApplicationConfig } from '@angular/core';
// Importa appConfig de la configuración base del cliente
import { appConfig } from './app.config'; 
import { provideServerRendering } from '@angular/platform-server'; // <-- Manténlo si es necesario para el merge

export const config: ApplicationConfig = {
  // Extiende las configuraciones base del cliente
  // Esto es crucial para que el server build conozca los routes y otros providers
  ...appConfig, 
  providers: [
    // Los proveedores específicos del servidor (si los hubiera)
    // No debería incluir provideHttpClient ni provideServerRendering aquí.
    provideServerRendering() // < -- Si tu CLI lo genera aquí, déjalo, pero lo ideal es que lo coja del appConfig principal.
                           // Si esto causa conflictos, podríamos explorar quitarlo de aquí.
  ]
};