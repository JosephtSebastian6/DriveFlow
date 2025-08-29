// src/main.server.ts
import { renderApplication } from '@angular/platform-server';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config'; // Configuración de la app cliente

const createApplication = () => bootstrapApplication(AppComponent, appConfig);

const bootstrap = () => renderApplication(createApplication, {}); // <-- ¡Añade el segundo argumento, un objeto vacío!

export default bootstrap;