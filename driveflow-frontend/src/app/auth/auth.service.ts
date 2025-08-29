import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private loggedIn = new BehaviorSubject<boolean>(!!localStorage.getItem('authToken'));
  isLoggedIn$ = this.loggedIn.asObservable();

  login(token: string) {
    localStorage.setItem('authToken', token);
    this.loggedIn.next(true);
  }

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    this.loggedIn.next(false);
  }
}
