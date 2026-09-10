import { Component, inject } from '@angular/core';
import { PaymentFlowService } from '../../payment-flow.service';

@Component({
  selector: 'app-student-step',
  standalone: true,
  templateUrl: './student-step.component.html',
  styleUrl: './student-step.component.scss'
})
export class StudentStepComponent {
  readonly flow = inject(PaymentFlowService);

  select(id: string): void {
    this.flow.selectStudent(id);
  }

  onNiveauChange(event: Event): void {
    this.flow.setNiveauFilter((event.target as HTMLSelectElement).value);
  }

  onClasseChange(event: Event): void {
    this.flow.setClasseFilter((event.target as HTMLSelectElement).value);
  }
}
