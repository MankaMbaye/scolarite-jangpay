import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register-tenant/register-tenant.component').then((m) => m.RegisterTenantComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
  },
  {
    path: 'jangpay/payer',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/jangpay/parent/payment-flow/payment-flow.component').then((m) => m.PaymentFlowComponent)
  },
  {
    path: 'jangpay/frais',
    canActivate: [authGuard],
    loadComponent: () => import('./features/jangpay/fees/fees-list/fees-list.component').then((m) => m.FeesListComponent)
  },
  {
    path: 'jangpay/transactions',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/jangpay/transactions/transactions-list/transactions-list.component').then((m) => m.TransactionsListComponent)
  },
  {
    path: 'jangpay/transactions/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/jangpay/transactions/transaction-detail/transaction-detail.component').then((m) => m.TransactionDetailComponent)
  },
  {
    path: 'jangpay/recus/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/jangpay/receipts/receipt-view/receipt-view.component').then((m) => m.ReceiptViewComponent)
  },
  { path: '**', redirectTo: 'login' }
];
