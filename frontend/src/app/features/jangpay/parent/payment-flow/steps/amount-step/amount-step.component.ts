import { Component, inject } from '@angular/core';
import { PaymentFlowService } from '../../payment-flow.service';
import { formatXof } from '../../../../models/jangpay.models';

@Component({
  selector: 'app-amount-step',
  standalone: true,
  templateUrl: './amount-step.component.html',
  styleUrl: './amount-step.component.scss'
})
export class AmountStepComponent {
  readonly flow = inject(PaymentFlowService);
  readonly formatXof = formatXof;

  onAmountInput(value: string): void {
    if (value === '') {
      this.flow.setCustomAmount(null);
      return;
    }
    const parsed = Number(value);
    this.flow.setCustomAmount(Number.isFinite(parsed) ? parsed : null);
  }
}
