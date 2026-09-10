import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FeesService } from '../fees.service';
import { FeeFormModalComponent, FeeFormMode } from '../fee-form-modal/fee-form-modal.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { FEE_CATEGORY_LABELS, FeeCategory, FeeDefinition, formatDate, formatXof } from '../../models/jangpay.models';
import { SortField } from '../fees.service';

type ConfirmAction = 'deactivate' | 'delete';

@Component({
  selector: 'app-fees-list',
  standalone: true,
  imports: [FeeFormModalComponent, ConfirmDialogComponent],
  templateUrl: './fees-list.component.html',
  styleUrl: './fees-list.component.scss'
})
export class FeesListComponent {
  readonly fees = inject(FeesService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly categories = Object.entries(FEE_CATEGORY_LABELS) as [FeeCategory, string][];
  readonly categoryLabels = FEE_CATEGORY_LABELS;
  readonly formatXof = formatXof;
  readonly formatDate = formatDate;

  readonly canDelete = computed(() => this.auth.currentUser()?.role === 'TENANT_ADMIN');

  readonly formOpen = signal(false);
  readonly formMode = signal<FeeFormMode>('create');
  readonly editingFee = signal<FeeDefinition | null>(null);

  readonly confirmTarget = signal<{ fee: FeeDefinition; action: ConfirmAction } | null>(null);
  readonly confirmData = computed<ConfirmDialogData | null>(() => {
    const target = this.confirmTarget();
    if (!target) return null;
    if (target.action === 'delete') {
      return {
        title: 'Supprimer ce frais ?',
        message: `Cette action est irréversible. « ${target.fee.name} » sera définitivement supprimé.`,
        confirmLabel: 'Supprimer',
        tone: 'danger'
      };
    }
    return {
      title: 'Désactiver ce frais ?',
      message: `Les parents ne pourront plus être facturés pour « ${target.fee.name} ». Vous pourrez le réactiver à tout moment.`,
      confirmLabel: 'Désactiver',
      tone: 'warning'
    };
  });

  readonly pageNumbers = computed(() => Array.from({ length: this.fees.totalPages() }, (_, i) => i + 1));

  onSearchInput(value: string): void {
    this.fees.setSearch(value);
  }

  onSort(field: SortField): void {
    this.fees.toggleSort(field);
  }

  sortIndicator(field: SortField): 'asc' | 'desc' | null {
    return this.fees.sortField() === field ? this.fees.sortDir() : null;
  }

  openCreate(): void {
    this.formMode.set('create');
    this.editingFee.set(null);
    this.formOpen.set(true);
  }

  openEdit(fee: FeeDefinition): void {
    this.formMode.set('edit');
    this.editingFee.set(fee);
    this.formOpen.set(true);
  }

  openView(fee: FeeDefinition): void {
    this.formMode.set('view');
    this.editingFee.set(fee);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
  }

  onFormSave(value: Omit<FeeDefinition, 'id' | 'createdAt'>): void {
    const editing = this.editingFee();
    if (this.formMode() === 'edit' && editing) {
      this.fees.updateFee(editing.id, value);
    } else {
      this.fees.addFee(value);
    }
    this.closeForm();
  }

  onToggleStatus(fee: FeeDefinition): void {
    if (fee.status === 'ACTIVE') {
      this.confirmTarget.set({ fee, action: 'deactivate' });
    } else {
      this.fees.toggleStatus(fee.id);
    }
  }

  requestDelete(fee: FeeDefinition): void {
    this.confirmTarget.set({ fee, action: 'delete' });
  }

  onConfirm(): void {
    const target = this.confirmTarget();
    if (!target) return;
    if (target.action === 'delete') {
      this.fees.deleteFee(target.fee.id);
    } else {
      this.fees.toggleStatus(target.fee.id);
    }
    this.confirmTarget.set(null);
  }

  onCancelConfirm(): void {
    this.confirmTarget.set(null);
  }

  backToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
