import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TransactionsService } from '../transactions.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { MethodBadgeComponent } from '../../shared/ui/method-badge/method-badge.component';
import {
  FEE_CATEGORY_LABELS,
  PAYMENT_METHODS,
  TRANSACTION_STATUS_LABELS,
  TransactionStatus,
  formatDate,
  formatDateTime,
  formatXof,
  transactionStatusTone
} from '../../models/jangpay.models';

@Component({
  selector: 'app-transaction-detail',
  standalone: true,
  imports: [ConfirmDialogComponent, MethodBadgeComponent],
  templateUrl: './transaction-detail.component.html',
  styleUrl: './transaction-detail.component.scss'
})
export class TransactionDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly tx = inject(TransactionsService);

  readonly categoryLabels = FEE_CATEGORY_LABELS;
  readonly statusLabels = TRANSACTION_STATUS_LABELS;
  readonly methods = PAYMENT_METHODS;
  readonly formatXof = formatXof;
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;

  private readonly refreshTick = signal(0);

  readonly transactionId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly transaction = computed(() => {
    this.refreshTick();
    return this.tx.getById(this.transactionId) ?? null;
  });

  readonly methodOf = computed(() => {
    const t = this.transaction();
    return t ? this.methods.find((m) => m.id === t.method) : undefined;
  });

  readonly refundEligible = computed(() => this.transaction()?.status === 'SUCCESS');
  readonly receiptEligible = computed(() => {
    const status = this.transaction()?.status;
    return status === 'SUCCESS' || status === 'REFUNDED';
  });
  readonly showConfirm = signal(false);

  readonly confirmData: ConfirmDialogData = {
    title: 'Rembourser cette transaction ?',
    message: 'Le parent sera notifié et le statut passera à « Remboursé ». Cette action est enregistrée dans l’historique.',
    confirmLabel: 'Rembourser',
    tone: 'warning'
  };

  statusTone(status: TransactionStatus): string {
    return transactionStatusTone(status);
  }

  requestRefund(): void {
    this.showConfirm.set(true);
  }

  confirmRefund(): void {
    this.tx.refund(this.transactionId);
    this.refreshTick.update((n) => n + 1);
    this.showConfirm.set(false);
  }

  cancelRefund(): void {
    this.showConfirm.set(false);
  }

  print(): void {
    window.print();
  }

  backToList(): void {
    this.router.navigate(['/jangpay/transactions']);
  }

  viewReceipt(): void {
    this.router.navigate(['/jangpay/recus', this.transactionId]);
  }
}
