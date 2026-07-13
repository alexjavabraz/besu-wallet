import { Routes } from '@angular/router';
import { noWalletGuard, walletGuard } from './core/wallet.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'carteira' },
  {
    path: 'acesso',
    canActivate: [noWalletGuard],
    loadComponent: () => import('./pages/onboarding/onboarding').then((m) => m.OnboardingPage),
  },
  {
    path: 'carteira',
    canActivate: [walletGuard],
    loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardPage),
  },
  {
    path: 'compilador',
    loadComponent: () => import('./pages/compiler/compiler').then((m) => m.CompilerPage),
  },
  {
    path: 'contratos',
    loadComponent: () => import('./pages/contracts/contracts').then((m) => m.ContractsPage),
  },
  {
    path: 'config',
    loadComponent: () => import('./pages/settings/settings').then((m) => m.SettingsPage),
  },
  { path: '**', redirectTo: 'carteira' },
];
