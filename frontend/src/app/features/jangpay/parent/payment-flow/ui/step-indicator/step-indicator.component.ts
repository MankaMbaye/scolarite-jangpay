import { Component, input } from '@angular/core';

export interface StepIndicatorItem {
  label: string;
}

@Component({
  selector: 'app-step-indicator',
  standalone: true,
  templateUrl: './step-indicator.component.html',
  styleUrl: './step-indicator.component.scss'
})
export class StepIndicatorComponent {
  readonly steps = input.required<StepIndicatorItem[]>();
  readonly currentIndex = input.required<number>();
}
