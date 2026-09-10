import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PaymentFlowService } from '../../payment-flow.service';
import { formatDateTime, formatXof } from '../../../../models/jangpay.models';

@Component({
  selector: 'app-result-step',
  standalone: true,
  templateUrl: './result-step.component.html',
  styleUrl: './result-step.component.scss'
})
export class ResultStepComponent {
  readonly flow = inject(PaymentFlowService);
  private readonly router = inject(Router);

  readonly formatXof = formatXof;
  readonly formatDateTime = formatDateTime;

  backToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  viewReceipt(): void {
    const ref = this.flow.result()?.transactionRef;
    if (ref) {
      this.router.navigate(['/jangpay/recus', ref]);
    }
  }

  retry(): void {
    this.flow.goToStep(3);
    this.flow.result.set(null);
  }
}
