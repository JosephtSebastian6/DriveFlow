import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPasswordComponent {
  email = '';
  loading = false;
  message: string | null = null;
  error: string | null = null;

  constructor(private auth: AuthService) {}

  submit() {
    this.message = null; this.error = null; this.loading = true;
    this.auth.requestPasswordReset(this.email).subscribe({
      next: () => { this.message = 'Si el correo existe, te enviamos un enlace para restablecer la contraseña.'; this.loading = false; },
      error: () => { this.error = 'No fue posible procesar la solicitud. Inténtalo más tarde.'; this.loading = false; }
    });
  }
}
