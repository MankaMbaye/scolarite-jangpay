import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TransactionsService, SortField } from '../transactions.service';
import { MethodBadgeComponent } from '../../shared/ui/method-badge/method-badge.component';
import {
  FEE_CATEGORY_LABELS,
  FeeCategory,
  PAYMENT_METHODS,
  PaymentMethodId,
  TRANSACTION_STATUS_LABELS,
  TransactionStatus,
  formatDate,
  formatXof,
  transactionStatusTone
} from '../../models/jangpay.models';

@Component({
  selector: 'app-transactions-list',
  standalone: true,
  imports: [MethodBadgeComponent],
  templateUrl: './transactions-list.component.html',
  styleUrl: './transactions-list.component.scss'
})
export class TransactionsListComponent {
  readonly tx = inject(TransactionsService);
  private readonly router = inject(Router);

  readonly categories = Object.entries(FEE_CATEGORY_LABELS) as [FeeCategory, string][];
  readonly categoryLabels = FEE_CATEGORY_LABELS;
  readonly methods = PAYMENT_METHODS;
  readonly statuses = Object.entries(TRANSACTION_STATUS_LABELS) as [TransactionStatus, string][];
  readonly statusLabels = TRANSACTION_STATUS_LABELS;

  readonly formatXof = formatXof;
  readonly formatDate = formatDate;

  readonly pageNumbers = computed(() => Array.from({ length: this.tx.totalPages() }, (_, i) => i + 1));

  onSearchInput(value: string): void {
    this.tx.setSearch(value);
  }

  onSort(field: SortField): void {
    this.tx.toggleSort(field);
  }

  sortIndicator(field: SortField): 'asc' | 'desc' | null {
    return this.tx.sortField() === field ? this.tx.sortDir() : null;
  }

  methodOf(id: PaymentMethodId) {
    return this.methods.find((m) => m.id === id)!;
  }

  statusTone(status: TransactionStatus): string {
    return transactionStatusTone(status);
  }

  timeOf(iso: string): string {
    return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  }

  viewDetail(id: string): void {
    this.router.navigate(['/jangpay/transactions', id]);
  }

  backToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
