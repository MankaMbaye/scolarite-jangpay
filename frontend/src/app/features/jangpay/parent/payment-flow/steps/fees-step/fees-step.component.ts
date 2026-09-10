import { Component, inject } from '@angular/core';
import { PaymentFlowService } from '../../payment-flow.service';
import {
  FEE_CATEGORY_LABELS,
  FEE_STATUS_LABELS,
  FeeItem,
  TRANSACTION_STATUS_LABELS,
  formatDate,
  formatDateTime,
  formatXof,
  transactionStatusTone
} from '../../../../models/jangpay.models';

@Component({
  selector: 'app-fees-step',
  standalone: true,
  templateUrl: './fees-step.component.html',
  styleUrl: './fees-step.component.scss'
})
export class FeesStepComponent {
  readonly flow = inject(PaymentFlowService);
  readonly categoryLabels = FEE_CATEGORY_LABELS;
  readonly statusLabels = FEE_STATUS_LABELS;
  readonly transactionStatusLabels = TRANSACTION_STATUS_LABELS;
  readonly transactionStatusTone = transactionStatusTone;

  readonly formatXof = formatXof;
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;

  toggle(fee: FeeItem): void {
    this.flow.toggleFee(fee.id);
  }

  statusTone(status: FeeItem['status']): string {
    switch (status) {
      case 'SOLDEE':
        return 'success';
      case 'PARTIELLE':
        return 'warning';
      case 'EN_RETARD':
        return 'critical';
      case 'EN_ATTENTE':
        return 'warning';
      default:
        return 'neutral';
    }
  }
}
