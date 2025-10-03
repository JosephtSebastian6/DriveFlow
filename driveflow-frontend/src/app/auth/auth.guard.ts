import { Injectable, inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';

// Guard en formato de función (Angular standalone)
export const authGuardChild: CanActivateChildFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('authToken');
  if (token) return true;
  // Redirigir a login y preservar URL intentada
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

@Injectable({ providedIn: 'root' })
export class DummyProvider {}
