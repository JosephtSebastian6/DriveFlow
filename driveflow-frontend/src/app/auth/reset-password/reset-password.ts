import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.css']
})
export class ResetPasswordComponent {
  token = '';
  password = '';
  confirm = '';
  loading = false;
  message: string | null = null;
  error: string | null = null;

  constructor(private route: ActivatedRoute, private auth: AuthService, private router: Router) {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
  }

  submit() {
    this.message = null; this.error = null;
    if (!this.password || this.password.length < 8) { this.error = 'La contraseña debe tener al menos 8 caracteres.'; return; }
    if (this.password !== this.confirm) { this.error = 'Las contraseñas no coinciden.'; return; }
    this.loading = true;
    this.auth.confirmPasswordReset(this.token, this.password).subscribe({
      next: () => { this.message = 'Tu contraseña fue restablecida.'; this.loading = false; setTimeout(() => this.router.navigate(['/login']), 1200); },
      error: () => { this.error = 'El enlace no es válido o expiró.'; this.loading = false; }
    });
  }
}
