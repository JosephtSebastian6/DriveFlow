import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, delay } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private loggedIn = new BehaviorSubject<boolean>(!!localStorage.getItem('authToken'));
  isLoggedIn$ = this.loggedIn.asObservable();
  private apiBase = 'http://localhost:8000'; // Ajusta cuando tengas backend listo

  constructor(private http: HttpClient) {}

  login(token: string) {
    localStorage.setItem('authToken', token);
    this.loggedIn.next(true);
  }

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    this.loggedIn.next(false);
  }

  // Solicitud de reseteo de contraseña
  requestPasswordReset(email: string): Observable<void> {
    try {
      return this.http.post<void>(`${this.apiBase}/auth/password-reset/request`, { email });
    } catch {
      // Fallback simulado
      return of(void 0).pipe(delay(600));
    }
  }

  // Confirmación de reseteo
  confirmPasswordReset(token: string, newPassword: string): Observable<void> {
    try {
      return this.http.post<void>(`${this.apiBase}/auth/password-reset/confirm`, { token, new_password: newPassword });
    } catch {
      // Fallback simulado
      return of(void 0).pipe(delay(600));
    }
  }
}
