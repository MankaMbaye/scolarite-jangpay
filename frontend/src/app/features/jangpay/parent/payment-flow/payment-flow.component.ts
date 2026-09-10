import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PaymentFlowService } from './payment-flow.service';
import { formatXof } from '../../models/jangpay.models';
import { StepIndicatorComponent } from './ui/step-indicator/step-indicator.component';
import { StudentStepComponent } from './steps/student-step/student-step.component';
import { FeesStepComponent } from './steps/fees-step/fees-step.component';
import { AmountStepComponent } from './steps/amount-step/amount-step.component';
import { MethodStepComponent } from './steps/method-step/method-step.component';
import { ConfirmStepComponent } from './steps/confirm-step/confirm-step.component';
import { ResultStepComponent } from './steps/result-step/result-step.component';

const STEP_LABELS = [{ label: 'Élève' }, { label: 'Frais' }, { label: 'Montant' }, { label: 'Paiement' }, { label: 'Confirmation' }];

@Component({
  selector: 'app-payment-flow',
  standalone: true,
  providers: [PaymentFlowService],
  imports: [
    StepIndicatorComponent,
    StudentStepComponent,
    FeesStepComponent,
    AmountStepComponent,
    MethodStepComponent,
    ConfirmStepComponent,
    ResultStepComponent
  ],
  templateUrl: './payment-flow.component.html',
  styleUrl: './payment-flow.component.scss'
})
export class PaymentFlowComponent {
  readonly flow = inject(PaymentFlowService);
  private readonly router = inject(Router);

  readonly stepLabels = STEP_LABELS;
  readonly formatXof = formatXof;

  readonly isResultStep = computed(() => this.flow.currentStep() === 'result');
  readonly isConfirmStep = computed(() => this.flow.currentStep() === 'confirm');
  readonly isFirstStep = computed(() => this.flow.currentStepIndex() === 0);

  cancel(): void {
    this.router.navigate(['/dashboard']);
  }

  onPrimaryAction(): void {
    if (this.isConfirmStep()) {
      this.flow.submitPayment();
    } else {
      this.flow.next();
    }
  }
}
