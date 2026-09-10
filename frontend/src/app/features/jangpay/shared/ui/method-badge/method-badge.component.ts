import { Component, input } from '@angular/core';
import { PaymentMethodOption } from '../../../models/jangpay.models';

/** Real provider logo when we have one (Wave, Orange Money); an accent-colored dot otherwise. */
@Component({
  selector: 'app-method-badge',
  standalone: true,
  templateUrl: './method-badge.component.html',
  styleUrl: './method-badge.component.scss'
})
export class MethodBadgeComponent {
  readonly method = input.required<PaymentMethodOption>();
  readonly showLabel = input(true);
}
