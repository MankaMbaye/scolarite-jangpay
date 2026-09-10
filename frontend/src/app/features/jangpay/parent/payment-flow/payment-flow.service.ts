import { Injectable, computed, inject, signal } from '@angular/core';
import {
  FEE_CATEGORY_LABELS,
  FeeCategory,
  FeeItem,
  FeeStatus,
  PAYMENT_METHODS,
  PaymentMethodId,
  PaymentResult,
  SCHOOL_CYCLES,
  Student,
  TransactionRecord
} from '../../models/jangpay.models';
import { TransactionsService } from '../../transactions/transactions.service';
import { AuthService } from '../../../../core/auth/auth.service';

/** The wizard only knows "the current parent"; this app has a single logged-in demo parent for now. */
const CURRENT_PARENT = {
  name: 'Fatou Ndiaye',
  email: 'fatou.ndiaye@example.sn',
  phone: '+221 77 123 45 67'
};

export type WizardStepId = 'student' | 'fees' | 'amount' | 'method' | 'confirm' | 'result';

const STEP_ORDER: WizardStepId[] = ['student', 'fees', 'amount', 'method', 'confirm', 'result'];

const MOCK_STUDENTS: Student[] = [
  {
    id: 'std-aminata',
    fullName: 'Aminata Ndiaye',
    matricule: 'ELV-2026-0142',
    classLevel: 'CM2',
    academicYear: '2026-2027',
    initials: 'AN'
  },
  {
    id: 'std-moussa',
    fullName: 'Moussa Ndiaye',
    matricule: 'ELV-2026-0187',
    classLevel: '6ème',
    academicYear: '2026-2027',
    initials: 'MN'
  }
];

const MOCK_FEES: FeeItem[] = [
  { id: 'fee-a-1', studentId: 'std-aminata', category: 'INSCRIPTION', totalAmount: 25000, paidAmount: 25000, dueDate: '2026-09-01', status: 'SOLDEE' },
  { id: 'fee-a-2', studentId: 'std-aminata', category: 'SCOLARITE', totalAmount: 120000, paidAmount: 65000, dueDate: '2026-09-15', status: 'PARTIELLE' },
  { id: 'fee-a-3', studentId: 'std-aminata', category: 'TRANSPORT', totalAmount: 20000, paidAmount: 0, dueDate: '2026-09-15', status: 'EN_ATTENTE' },
  { id: 'fee-a-4', studentId: 'std-aminata', category: 'CANTINE', totalAmount: 15000, paidAmount: 15000, dueDate: '2026-09-01', status: 'SOLDEE' },

  { id: 'fee-m-1', studentId: 'std-moussa', category: 'INSCRIPTION', totalAmount: 20000, paidAmount: 20000, dueDate: '2026-09-01', status: 'SOLDEE' },
  { id: 'fee-m-2', studentId: 'std-moussa', category: 'SCOLARITE', totalAmount: 90000, paidAmount: 32000, dueDate: '2026-09-15', status: 'PARTIELLE' },
  { id: 'fee-m-3', studentId: 'std-moussa', category: 'TRANSPORT', totalAmount: 20000, paidAmount: 10000, dueDate: '2026-07-15', status: 'EN_RETARD' }
];

function initialsOf(fullName: string): string {
  return fullName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface FeeProfile {
  category: FeeCategory;
  totalAmount: number;
  paidAmount: number;
  status: FeeStatus;
  dueDate: string;
}

/**
 * Fee items for the accountant's school-wide student search — kept separate from MOCK_FEES (which
 * is scoped to the demo parent's own two children under their own id namespace). Cycles through a
 * small set of realistic profiles so browsing the search naturally covers every fee state,
 * including a student with no outstanding fees at all ("élève sans frais").
 */
function buildSchoolFeeCatalog(students: { id: string }[]): FeeItem[] {
  const profiles: FeeProfile[][] = [
    [
      { category: 'INSCRIPTION', totalAmount: 25000, paidAmount: 25000, status: 'SOLDEE', dueDate: '2026-09-01' },
      { category: 'SCOLARITE', totalAmount: 100000, paidAmount: 50000, status: 'PARTIELLE', dueDate: '2026-09-15' }
    ],
    [
      { category: 'SCOLARITE', totalAmount: 90000, paidAmount: 0, status: 'EN_ATTENTE', dueDate: '2026-09-15' },
      { category: 'CANTINE', totalAmount: 15000, paidAmount: 15000, status: 'SOLDEE', dueDate: '2026-09-01' }
    ],
    [
      { category: 'TRANSPORT', totalAmount: 20000, paidAmount: 0, status: 'EN_RETARD', dueDate: '2026-07-15' },
      { category: 'INSCRIPTION', totalAmount: 20000, paidAmount: 20000, status: 'SOLDEE', dueDate: '2026-09-01' }
    ],
    []
  ];

  return students.flatMap((student, index) =>
    profiles[index % profiles.length].map((profile, profileIndex) => ({
      id: `fee-school-${student.id}-${profileIndex}`,
      studentId: student.id,
      ...profile
    }))
  );
}

@Injectable()
export class PaymentFlowService {
  private readonly transactionsService = inject(TransactionsService);
  private readonly auth = inject(AuthService);

  /** Every student in the establishment, for the accountant's niveau/classe search — the parent's own view stays MOCK_STUDENTS. */
  private readonly schoolRoster: Student[] = this.transactionsService.students.map((s) => ({
    id: s.id,
    fullName: s.fullName,
    matricule: s.matricule,
    classLevel: s.classLevel,
    academicYear: '2026-2027',
    initials: initialsOf(s.fullName)
  }));

  private readonly schoolFeeCatalog: FeeItem[] = buildSchoolFeeCatalog(this.transactionsService.students);

  readonly steps = STEP_ORDER;
  readonly currentStepIndex = signal(0);
  readonly attemptedAdvance = signal(false);
  readonly submitting = signal(false);
  readonly result = signal<PaymentResult | null>(null);

  readonly methods = PAYMENT_METHODS;

  readonly selectedStudentId = signal<string | null>(null);
  readonly selectedFeeIds = signal<Set<string>>(new Set());
  readonly paymentType = signal<'complete' | 'partial'>('complete');
  readonly customAmount = signal<number | null>(null);
  readonly selectedMethodId = signal<PaymentMethodId | null>(null);
  readonly confirmed = signal(false);

  /** Comptable/Administrateur see the whole school roster (searchable by niveau/classe); a parent sees only their own children. */
  readonly isStaff = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'ACCOUNTANT' || role === 'TENANT_ADMIN';
  });

  readonly students = computed<Student[]>(() => (this.isStaff() ? this.schoolRoster : MOCK_STUDENTS));
  readonly allFees = computed<FeeItem[]>(() => (this.isStaff() ? this.schoolFeeCatalog : MOCK_FEES));

  readonly niveauFilter = signal<string>('ALL');
  readonly classeFilter = signal<string>('ALL');

  readonly availableNiveaux = SCHOOL_CYCLES.map((cycle) => cycle.label);

  readonly availableClasses = computed(() => {
    const niveau = this.niveauFilter();
    if (niveau === 'ALL') return [];
    return SCHOOL_CYCLES.find((cycle) => cycle.label === niveau)?.classes ?? [];
  });

  /** The staff student search only shows results once a classe is chosen — never the full roster unfiltered. */
  readonly filteredStudents = computed(() => {
    const classe = this.classeFilter();
    if (classe === 'ALL') return [];
    return this.students().filter((s) => s.classLevel === classe);
  });

  readonly currentStep = computed<WizardStepId>(() => this.steps[this.currentStepIndex()]);

  readonly selectedStudent = computed(() => this.students().find((s) => s.id === this.selectedStudentId()) ?? null);

  readonly studentFees = computed(() => {
    const id = this.selectedStudentId();
    return id ? this.allFees().filter((f) => f.studentId === id) : [];
  });

  /** Past payments for the selected student, shown to staff alongside the outstanding fees — the parent flow's own two mock students have no seeded history under their id namespace. */
  readonly selectedStudentHistory = computed<TransactionRecord[]>(() => {
    const id = this.selectedStudentId();
    if (!id || !this.isStaff()) return [];
    return this.transactionsService.getByStudentId(id);
  });

  readonly selectedFees = computed(() => this.studentFees().filter((f) => this.selectedFeeIds().has(f.id)));

  readonly totalDue = computed(() => this.selectedFees().reduce((sum, f) => sum + f.totalAmount, 0));
  readonly totalPaid = computed(() => this.selectedFees().reduce((sum, f) => sum + f.paidAmount, 0));
  readonly totalRemaining = computed(() => this.totalDue() - this.totalPaid());

  readonly amountToPay = computed(() =>
    this.paymentType() === 'complete' ? this.totalRemaining() : this.customAmount() ?? 0
  );

  readonly amountError = computed(() => {
    if (this.paymentType() !== 'partial') return null;
    const amount = this.customAmount();
    if (amount === null || amount === undefined) return 'Indiquez un montant.';
    if (amount <= 0) return 'Le montant doit être supérieur à 0.';
    if (amount > this.totalRemaining()) return 'Le montant ne peut pas dépasser le solde restant.';
    return null;
  });

  readonly selectedMethod = computed(() => this.methods.find((m) => m.id === this.selectedMethodId()) ?? null);

  readonly stepValid = computed<Record<WizardStepId, boolean>>(() => ({
    student: !!this.selectedStudentId(),
    fees: this.selectedFeeIds().size > 0,
    amount: this.totalRemaining() > 0 && this.amountToPay() > 0 && !this.amountError(),
    method: !!this.selectedMethodId(),
    confirm: this.confirmed(),
    result: true
  }));

  readonly canAdvance = computed(() => this.stepValid()[this.currentStep()]);

  selectStudent(id: string): void {
    if (this.selectedStudentId() === id) return;
    this.selectedStudentId.set(id);
    this.selectedFeeIds.set(new Set());
    this.paymentType.set('complete');
    this.customAmount.set(null);
  }

  setNiveauFilter(value: string): void {
    this.niveauFilter.set(value);
    this.classeFilter.set('ALL');
  }

  setClasseFilter(value: string): void {
    this.classeFilter.set(value);
  }

  toggleFee(id: string): void {
    const fee = this.studentFees().find((f) => f.id === id);
    if (!fee || fee.status === 'SOLDEE') return;
    const next = new Set(this.selectedFeeIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedFeeIds.set(next);
    this.customAmount.set(null);
  }

  setPaymentType(type: 'complete' | 'partial'): void {
    this.paymentType.set(type);
    if (type === 'complete') {
      this.customAmount.set(this.totalRemaining());
    }
  }

  setCustomAmount(value: number | null): void {
    this.customAmount.set(value);
  }

  selectMethod(id: PaymentMethodId): void {
    this.selectedMethodId.set(id);
  }

  setConfirmed(value: boolean): void {
    this.confirmed.set(value);
  }

  next(): void {
    this.attemptedAdvance.set(true);
    if (!this.canAdvance()) return;
    this.attemptedAdvance.set(false);
    this.currentStepIndex.update((i) => Math.min(i + 1, this.steps.length - 2));
  }

  previous(): void {
    this.attemptedAdvance.set(false);
    this.currentStepIndex.update((i) => Math.max(i - 1, 0));
  }

  goToStep(index: number): void {
    if (index < this.currentStepIndex()) {
      this.attemptedAdvance.set(false);
      this.currentStepIndex.set(index);
    }
  }

  submitPayment(): void {
    // Guards against a double-click or any other re-entrant call firing two submissions for the
    // same confirmation — without this, two calls landing before the first `setTimeout` resolves
    // would both pass validation and each record its own transaction.
    if (this.submitting()) return;

    this.attemptedAdvance.set(true);
    if (!this.canAdvance()) return;

    this.submitting.set(true);
    const student = this.selectedStudent();
    const method = this.selectedMethod();
    const amount = this.amountToPay();

    setTimeout(() => {
      this.submitting.set(false);

      const now = new Date().toISOString();
      const fees = this.selectedFees();
      const primaryCategory: FeeCategory = fees[0]?.category ?? 'AUTRES';
      const feeLabel = Array.from(new Set(fees.map((f) => FEE_CATEGORY_LABELS[f.category]))).join(', ');
      const parentInfo = student ? this.resolveParentInfo(student) : CURRENT_PARENT;

      const transaction = this.transactionsService.addTransaction({
        date: now,
        studentId: student?.id ?? '',
        studentName: student?.fullName ?? '',
        studentClass: student?.classLevel ?? '',
        studentMatricule: student?.matricule ?? '',
        parentName: parentInfo.name,
        parentEmail: parentInfo.email,
        parentPhone: parentInfo.phone,
        feeCategory: primaryCategory,
        feeLabel,
        amount,
        feeTotalAmount: this.totalDue(),
        paidToDate: this.totalPaid() + amount,
        method: this.selectedMethodId() as PaymentMethodId,
        status: 'SUCCESS',
        reference: `${method?.id ?? 'REF'}-${Math.floor(10000 + Math.random() * 89999)}`
      });

      this.result.set({
        status: 'SUCCESS',
        transactionRef: transaction.id,
        studentName: student?.fullName ?? '',
        amount,
        paidAt: now,
        methodLabel: method?.label ?? ''
      });
      this.currentStepIndex.set(this.steps.length - 1);
    }, 1200);
  }

  /** Only the parent-flow's two mock students map to CURRENT_PARENT; any school-roster student (accountant search) has its own parent on file. */
  private resolveParentInfo(student: Student): { name: string; email: string; phone: string } {
    const match = this.transactionsService.students.find((s) => s.id === student.id);
    if (match) {
      return { name: match.parentName, email: match.parentEmail, phone: match.parentPhone };
    }
    return CURRENT_PARENT;
  }
}
