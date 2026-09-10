import { Component, inject } from '@angular/core';
import { PaymentFlowService } from '../../payment-flow.service';
import { PaymentMethodId, formatXof } from '../../../../models/jangpay.models';

@Component({
  selector: 'app-method-step',
  standalone: true,
  templateUrl: './method-step.component.html',
  styleUrl: './method-step.component.scss'
})
export class MethodStepComponent {
  readonly flow = inject(PaymentFlowService);
  readonly formatXof = formatXof;

  select(id: PaymentMethodId): void {
    this.flow.selectMethod(id);
  }

  iconKind(id: PaymentMethodId): 'mobile' | 'card' | 'cash' {
    if (id === 'CARD') return 'card';
    if (id === 'CASH') return 'cash';
    return 'mobile';
  }
}
