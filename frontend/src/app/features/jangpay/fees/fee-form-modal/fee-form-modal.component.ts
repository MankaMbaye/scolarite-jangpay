import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import {
  ALL_CLASSES,
  FEE_CATEGORY_LABELS,
  FeeCategory,
  FeeDefinition,
  FeeDefinitionStatus,
  SCHOOL_CLASSES
} from '../../models/jangpay.models';

export type FeeFormMode = 'create' | 'edit' | 'view';
type TabId = 'general' | 'amount' | 'settings';

interface FeeFormValue {
  name: string;
  category: FeeCategory;
  description: string;
  amount: number | null;
  academicYear: string;
  classLevel: string;
  startDate: string;
  dueDate: string;
  status: FeeDefinitionStatus;
  mandatory: boolean;
}

function emptyValue(): FeeFormValue {
  return {
    name: '',
    category: 'SCOLARITE',
    description: '',
    amount: null,
    academicYear: '2026-2027',
    classLevel: ALL_CLASSES,
    startDate: '',
    dueDate: '',
    status: 'ACTIVE',
    mandatory: true
  };
}

@Component({
  selector: 'app-fee-form-modal',
  standalone: true,
  imports: [ModalComponent],
  templateUrl: './fee-form-modal.component.html',
  styleUrl: './fee-form-modal.component.scss'
})
export class FeeFormModalComponent {
  readonly mode = input.required<FeeFormMode>();
  readonly initial = input<FeeDefinition | null>(null);

  readonly save = output<Omit<FeeDefinition, 'id' | 'createdAt'>>();
  readonly close = output<void>();

  readonly categories = Object.entries(FEE_CATEGORY_LABELS) as [FeeCategory, string][];
  readonly classOptions = [ALL_CLASSES, ...SCHOOL_CLASSES];
  readonly allClasses = ALL_CLASSES;

  readonly activeTab = signal<TabId>('general');
  readonly attemptedSave = signal(false);
  readonly value = signal<FeeFormValue>(emptyValue());

  /** Guards against a double-click firing two `save` emits (and so two records) before the modal closes. */
  private submitted = false;

  readonly readonly = computed(() => this.mode() === 'view');

  readonly titleText = computed(() => {
    if (this.mode() === 'create') return 'Ajouter un frais';
    if (this.mode() === 'edit') return 'Modifier le frais';
    return 'Détail du frais';
  });

  readonly errors = computed(() => {
    const v = this.value();
    const e: Partial<Record<keyof FeeFormValue, string>> = {};
    if (!v.name.trim()) e.name = 'Le nom du frais est obligatoire.';
    if (v.amount === null || v.amount === undefined || v.amount <= 0) e.amount = 'Indiquez un montant supérieur à 0.';
    if (!/^\d{4}-\d{4}$/.test(v.academicYear)) e.academicYear = 'Format attendu : 2026-2027.';
    if (!v.startDate) e.startDate = 'La date de début est obligatoire.';
    if (!v.dueDate) e.dueDate = "La date d'échéance est obligatoire.";
    if (v.startDate && v.dueDate && v.dueDate < v.startDate) e.dueDate = 'L’échéance doit être postérieure à la date de début.';
    return e;
  });

  readonly generalHasError = computed(() => !!this.errors().name);
  readonly amountHasError = computed(() => !!this.errors().amount || !!this.errors().academicYear || !!this.errors().startDate || !!this.errors().dueDate);

  ngOnInit(): void {
    this.value.set(this.buildInitialValue());
  }

  private buildInitialValue(): FeeFormValue {
    const src = this.initial();
    if (!src) return emptyValue();
    return {
      name: src.name,
      category: src.category,
      description: src.description,
      amount: src.amount,
      academicYear: src.academicYear,
      classLevel: src.classLevel,
      startDate: src.startDate,
      dueDate: src.dueDate,
      status: src.status,
      mandatory: src.mandatory
    };
  }

  selectTab(tab: TabId): void {
    this.activeTab.set(tab);
  }

  patch<K extends keyof FeeFormValue>(key: K, val: FeeFormValue[K]): void {
    this.value.update((v) => ({ ...v, [key]: val }));
  }

  onAmountInput(raw: string): void {
    if (raw === '') {
      this.patch('amount', null);
      return;
    }
    const parsed = Number(raw);
    this.patch('amount', Number.isFinite(parsed) ? parsed : null);
  }

  submit(): void {
    if (this.submitted) return;

    this.attemptedSave.set(true);
    const hasErrors = Object.keys(this.errors()).length > 0;
    if (hasErrors) {
      this.activeTab.set(this.generalHasError() ? 'general' : 'amount');
      return;
    }
    this.submitted = true;
    const v = this.value();
    this.save.emit({ ...v, amount: v.amount as number });
  }
}
