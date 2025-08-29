// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http'; // <-- ¡Añade withFetch!
import { provideServerRendering } from '@angular/platform-server'; // <-- Mantén esto si planeas usar SSR

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // ¡Aquí es donde se debe proporcionar HttpClient para el navegador!
    // Usamos withFetch() para una implementación moderna y compatible
    provideHttpClient(withFetch()), // <-- CAMBIO AQUÍ
    
    // Este proveedor es para la preparación de SSR, pero debe estar aquí.
    // Si sigue dando problemas, podríamos considerar moverlo condicionalmente,
    // pero idealmente funciona así.
    provideServerRendering() 
  ]
};