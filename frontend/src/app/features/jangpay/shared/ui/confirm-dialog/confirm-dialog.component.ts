import { Component, input, output } from '@angular/core';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel: string;
  tone: 'danger' | 'warning';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss'
})
export class ConfirmDialogComponent {
  readonly data = input.required<ConfirmDialogData>();
  readonly confirm = output<void>();
  readonly cancel = output<void>();
}
