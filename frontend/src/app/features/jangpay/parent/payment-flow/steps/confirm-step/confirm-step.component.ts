import { Component, inject } from '@angular/core';
import { PaymentFlowService } from '../../payment-flow.service';
import { FEE_CATEGORY_LABELS, formatDate, formatXof } from '../../../../models/jangpay.models';

@Component({
  selector: 'app-confirm-step',
  standalone: true,
  templateUrl: './confirm-step.component.html',
  styleUrl: './confirm-step.component.scss'
})
export class ConfirmStepComponent {
  readonly flow = inject(PaymentFlowService);
  readonly categoryLabels = FEE_CATEGORY_LABELS;
  readonly formatXof = formatXof;
  readonly today = formatDate(new Date().toISOString());

  onConfirmChange(checked: boolean): void {
    this.flow.setConfirmed(checked);
  }
}
