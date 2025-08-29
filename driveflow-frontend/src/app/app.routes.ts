// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { RegisterComponent } from './auth/register/register';
import { VerifyEmailComponent } from './auth/verify-email/verify-email';
import { EmailVerifiedSuccessComponent } from './auth/email-verified-success/email-verified-success';
import { LoginComponent } from './auth/login/login'; // <--- Importa el componente de Login
import { DashboardComponent } from './auth/dashboard/dashboard'
import { DashboardClienteComponent } from './auth/dashboard-cliente/dashboard-cliente';
import { DashboardEmpresaComponent } from './auth/dashboard-empresa/dashboard-empresa';
import { DashboardFuncionarioComponent } from './auth/dashboard-funcionario/dashboard-funcionario';
import { HomeComponent } from './auth/home/home';
import { DashboardGpsComponent } from './auth/dashboard-gps/dashboard-gps';
import { DashboardMiVehiculoComponent } from './auth/dashboard-mi-vehiculo/dashboard-mi-vehiculo';
import { LayoutComponent } from './auth/layout/layout';
import { DashboardEmpresaClientesComponent } from './auth/dashboard-empresa-clientes/dashboard-empresa-clientes';
import { DashboardEmpresaAgentes } from './auth/dashboard-empresa-agentes/dashboard-empresa-agentes';
import { DashboardEmpresaDispositivos } from './auth/dashboard-empresa-dispositivos/dashboard-empresa-dispositivos';

export const routes: Routes = [
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  { path: 'auth/verify-email', component: VerifyEmailComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'email-verified-success', component: EmailVerifiedSuccessComponent },
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'dashboard-cliente', component: DashboardClienteComponent },
      { path: 'dashboard-empresa', component: DashboardEmpresaComponent },
      { path: 'dashboard-funcionario', component: DashboardFuncionarioComponent },
      { path: 'dashboard-gps', component: DashboardGpsComponent },
      { path: 'dashboard-empresa-clientes', component: DashboardEmpresaClientesComponent },
      { path: 'dashboard-empresa-agentes', component: DashboardEmpresaAgentes },
      { path: 'dashboard-empresa-dispositivos', component: DashboardEmpresaDispositivos },
      { path: 'dashboard-mi-vehiculo', component: DashboardMiVehiculoComponent },
      { path: 'home', component: HomeComponent },
    ]
  }
];