// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config'; // Importa la configuración de la aplicación cliente
import { AppComponent } from './app/app.component'; // Importa tu componente raíz

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));