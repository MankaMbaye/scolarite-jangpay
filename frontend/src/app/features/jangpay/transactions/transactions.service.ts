import { Injectable, computed, signal } from '@angular/core';
import {
  FeeCategory,
  PaymentMethodId,
  TransactionHistoryEntry,
  TransactionRecord,
  TransactionStatus
} from '../models/jangpay.models';

export type SortField = 'date' | 'studentName' | 'amount';
export type SortDir = 'asc' | 'desc';
export type FilterAll = 'ALL';

const PAGE_SIZE = 8;

interface StudentSeed {
  id: string;
  fullName: string;
  classLevel: string;
  matricule: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
}

const STUDENTS: StudentSeed[] = [
  { id: 'std-1', fullName: 'Aminata Ndiaye', classLevel: 'CM2', matricule: 'ELV-2026-0142', parentName: 'Fatou Ndiaye', parentEmail: 'fatou.ndiaye@example.sn', parentPhone: '+221 77 123 45 67' },
  { id: 'std-2', fullName: 'Moussa Ndiaye', classLevel: '6ème', matricule: 'ELV-2026-0187', parentName: 'Fatou Ndiaye', parentEmail: 'fatou.ndiaye@example.sn', parentPhone: '+221 77 123 45 67' },
  { id: 'std-3', fullName: 'Cheikh Diallo', classLevel: 'CE2', matricule: 'ELV-2026-0093', parentName: 'Mariama Diallo', parentEmail: 'mariama.diallo@example.sn', parentPhone: '+221 76 234 56 78' },
  { id: 'std-4', fullName: 'Awa Fall', classLevel: 'Terminale', matricule: 'ELV-2026-0021', parentName: 'Ousmane Fall', parentEmail: 'ousmane.fall@example.sn', parentPhone: '+221 70 345 67 89' },
  { id: 'std-5', fullName: 'Ibrahima Ba', classLevel: 'CM1', matricule: 'ELV-2026-0166', parentName: 'Khady Ba', parentEmail: 'khady.ba@example.sn', parentPhone: '+221 78 456 78 90' },
  { id: 'std-6', fullName: 'Aïssatou Diop', classLevel: '5ème', matricule: 'ELV-2026-0074', parentName: 'Modou Diop', parentEmail: 'modou.diop@example.sn', parentPhone: '+221 77 567 89 01' },
  { id: 'std-7', fullName: 'Modou Sarr', classLevel: '4ème', matricule: 'ELV-2026-0058', parentName: 'Bineta Sarr', parentEmail: 'bineta.sarr@example.sn', parentPhone: '+221 76 678 90 12' },
  { id: 'std-8', fullName: 'Fatoumata Cissé', classLevel: '3ème', matricule: 'ELV-2026-0039', parentName: 'Alioune Cissé', parentEmail: 'alioune.cisse@example.sn', parentPhone: '+221 70 789 01 23' },
  { id: 'std-9', fullName: 'Ousmane Gueye', classLevel: 'CP', matricule: 'ELV-2026-0205', parentName: 'Ndeye Gueye', parentEmail: 'ndeye.gueye@example.sn', parentPhone: '+221 78 890 12 34' },
  { id: 'std-10', fullName: 'Mame Diarra Sy', classLevel: 'CE1', matricule: 'ELV-2026-0118', parentName: 'Lamine Sy', parentEmail: 'lamine.sy@example.sn', parentPhone: '+221 77 901 23 45' },

  // Appended (not interleaved) so SEED_ROWS' studentIdx above keeps pointing at the same students —
  // one extra student per class so every niveau/classe combination in the search has a real list,
  // including the three classes (CI, 2nde, 1ère) that previously had none at all.
  { id: 'std-11', fullName: 'Khadidiatou Faye', classLevel: 'CI', matricule: 'ELV-2026-0212', parentName: 'Aminata Faye', parentEmail: 'aminata.faye@example.sn', parentPhone: '+221 77 012 34 56' },
  { id: 'std-12', fullName: 'Serigne Sow', classLevel: 'CI', matricule: 'ELV-2026-0223', parentName: 'Mamadou Sow', parentEmail: 'mamadou.sow@example.sn', parentPhone: '+221 76 123 45 67' },
  { id: 'std-13', fullName: 'Ndeye Astou Mbaye', classLevel: 'CP', matricule: 'ELV-2026-0234', parentName: 'Cheikh Mbaye', parentEmail: 'cheikh.mbaye@example.sn', parentPhone: '+221 70 234 56 78' },
  { id: 'std-14', fullName: 'Babacar Thiam', classLevel: 'CE1', matricule: 'ELV-2026-0245', parentName: 'Awa Thiam', parentEmail: 'awa.thiam@example.sn', parentPhone: '+221 78 345 67 89' },
  { id: 'std-15', fullName: 'Rokhaya Kane', classLevel: 'CE2', matricule: 'ELV-2026-0256', parentName: 'Ibrahima Kane', parentEmail: 'ibrahima.kane@example.sn', parentPhone: '+221 75 456 78 90' },
  { id: 'std-16', fullName: 'Ousseynou Diagne', classLevel: 'CM1', matricule: 'ELV-2026-0267', parentName: 'Fatou Diagne', parentEmail: 'fatou.diagne@example.sn', parentPhone: '+221 77 567 89 01' },
  { id: 'std-17', fullName: 'Mouhamed Wade', classLevel: 'CM2', matricule: 'ELV-2026-0278', parentName: 'Ndeye Wade', parentEmail: 'ndeye.wade@example.sn', parentPhone: '+221 76 678 90 12' },
  { id: 'std-18', fullName: 'Astou Seck', classLevel: '6ème', matricule: 'ELV-2026-0289', parentName: 'Modou Seck', parentEmail: 'modou.seck@example.sn', parentPhone: '+221 70 789 01 23' },
  { id: 'std-19', fullName: 'Pape Ndour', classLevel: '5ème', matricule: 'ELV-2026-0291', parentName: 'Sokhna Ndour', parentEmail: 'sokhna.ndour@example.sn', parentPhone: '+221 78 890 12 34' },
  { id: 'std-20', fullName: 'Bineta Camara', classLevel: '4ème', matricule: 'ELV-2026-0302', parentName: 'Alioune Camara', parentEmail: 'alioune.camara@example.sn', parentPhone: '+221 75 901 23 45' },
  { id: 'std-21', fullName: 'Cheikh Touré', classLevel: '3ème', matricule: 'ELV-2026-0313', parentName: 'Ndeye Touré', parentEmail: 'ndeye.toure@example.sn', parentPhone: '+221 77 012 34 56' },
  { id: 'std-22', fullName: 'Aminata Diouf', classLevel: '2nde', matricule: 'ELV-2026-0324', parentName: 'Omar Diouf', parentEmail: 'omar.diouf@example.sn', parentPhone: '+221 76 123 45 67' },
  { id: 'std-23', fullName: 'Lamine Ndoye', classLevel: '2nde', matricule: 'ELV-2026-0335', parentName: 'Adama Ndoye', parentEmail: 'adama.ndoye@example.sn', parentPhone: '+221 70 234 56 78' },
  { id: 'std-24', fullName: 'Fatima Sarr', classLevel: '1ère', matricule: 'ELV-2026-0346', parentName: 'Moustapha Sarr', parentEmail: 'moustapha.sarr@example.sn', parentPhone: '+221 78 345 67 89' },
  { id: 'std-25', fullName: 'Abdoulaye Diakhaté', classLevel: '1ère', matricule: 'ELV-2026-0357', parentName: 'Coumba Diakhaté', parentEmail: 'coumba.diakhate@example.sn', parentPhone: '+221 75 456 78 90' },
  { id: 'std-26', fullName: 'Souleymane Gaye', classLevel: 'Terminale', matricule: 'ELV-2026-0368', parentName: 'Mariétou Gaye', parentEmail: 'marietou.gaye@example.sn', parentPhone: '+221 77 567 89 01' }
];

interface SeedRow {
  studentIdx: number;
  date: string;
  category: FeeCategory;
  label: string;
  amount: number;
  method: PaymentMethodId;
  status: TransactionStatus;
}

const SEED_ROWS: SeedRow[] = [
  { studentIdx: 0, date: '2026-08-29T09:12:00', category: 'SCOLARITE', label: 'Scolarité — Tranche 2', amount: 45000, method: 'WAVE', status: 'SUCCESS' },
  { studentIdx: 6, date: '2026-08-29T08:47:00', category: 'CANTINE', label: 'Cantine — Août', amount: 15000, method: 'CASH', status: 'SUCCESS' },
  { studentIdx: 1, date: '2026-08-28T17:20:00', category: 'TRANSPORT', label: 'Transport scolaire', amount: 10000, method: 'CARD', status: 'FAILED' },
  { studentIdx: 3, date: '2026-08-28T14:05:00', category: 'SCOLARITE', label: 'Scolarité — Tranche 1', amount: 60000, method: 'ORANGE_MONEY', status: 'PENDING' },
  { studentIdx: 4, date: '2026-08-28T11:30:00', category: 'CANTINE', label: 'Cantine — Août', amount: 15000, method: 'FREE_MONEY', status: 'SUCCESS' },
  { studentIdx: 5, date: '2026-08-27T16:48:00', category: 'SCOLARITE', label: 'Scolarité — Tranche 2', amount: 45000, method: 'CASH', status: 'SUCCESS' },
  { studentIdx: 6, date: '2026-08-27T10:02:00', category: 'TRANSPORT', label: 'Transport scolaire', amount: 20000, method: 'WAVE', status: 'SUCCESS' },
  { studentIdx: 7, date: '2026-08-26T15:44:00', category: 'INSCRIPTION', label: "Frais d'inscription", amount: 25000, method: 'ORANGE_MONEY', status: 'SUCCESS' },
  { studentIdx: 8, date: '2026-08-26T09:30:00', category: 'CANTINE', label: 'Cantine — Août', amount: 15000, method: 'CASH', status: 'SUCCESS' },
  { studentIdx: 9, date: '2026-08-25T13:15:00', category: 'SCOLARITE', label: 'Scolarité — Tranche 1', amount: 50000, method: 'WAVE', status: 'CANCELLED' },
  { studentIdx: 2, date: '2026-08-25T10:50:00', category: 'AUTRES', label: 'Uniforme scolaire', amount: 12000, method: 'CARD', status: 'SUCCESS' },
  { studentIdx: 0, date: '2026-08-24T09:05:00', category: 'CANTINE', label: 'Cantine — Août', amount: 15000, method: 'FREE_MONEY', status: 'SUCCESS' },
  { studentIdx: 3, date: '2026-08-23T16:22:00', category: 'TRANSPORT', label: 'Transport scolaire — zone étendue', amount: 30000, method: 'ORANGE_MONEY', status: 'REFUNDED' },
  { studentIdx: 4, date: '2026-08-22T11:10:00', category: 'SCOLARITE', label: 'Scolarité — Tranche 1', amount: 55000, method: 'WAVE', status: 'SUCCESS' },
  { studentIdx: 5, date: '2026-08-21T14:40:00', category: 'AUTRES', label: 'Frais de bibliothèque', amount: 5000, method: 'CASH', status: 'SUCCESS' },
  { studentIdx: 7, date: '2026-08-20T09:55:00', category: 'INSCRIPTION', label: "Frais d'inscription", amount: 25000, method: 'CARD', status: 'FAILED' },
  { studentIdx: 8, date: '2026-08-19T15:30:00', category: 'SCOLARITE', label: 'Scolarité — Tranche 1', amount: 48000, method: 'FREE_MONEY', status: 'SUCCESS' },
  { studentIdx: 1, date: '2026-08-18T10:12:00', category: 'CANTINE', label: 'Cantine — Juillet', amount: 15000, method: 'ORANGE_MONEY', status: 'REFUNDED' },
  { studentIdx: 9, date: '2026-08-17T12:00:00', category: 'SCOLARITE', label: 'Scolarité — Tranche 1', amount: 50000, method: 'WAVE', status: 'SUCCESS' },
  { studentIdx: 2, date: '2026-08-15T09:20:00', category: 'TRANSPORT', label: 'Transport scolaire', amount: 20000, method: 'CASH', status: 'SUCCESS' },
  { studentIdx: 6, date: '2026-08-13T16:05:00', category: 'AUTRES', label: "Frais d'examen blanc", amount: 10000, method: 'ORANGE_MONEY', status: 'PENDING' },
  { studentIdx: 0, date: '2026-08-10T09:40:00', category: 'INSCRIPTION', label: "Frais d'inscription", amount: 25000, method: 'WAVE', status: 'SUCCESS' },
  { studentIdx: 4, date: '2026-08-08T11:25:00', category: 'CANTINE', label: 'Cantine — Juillet', amount: 15000, method: 'CARD', status: 'PENDING' },
  { studentIdx: 5, date: '2026-08-05T14:15:00', category: 'INSCRIPTION', label: "Frais d'inscription", amount: 25000, method: 'CASH', status: 'SUCCESS' }
];

const METHOD_REF_PREFIX: Record<PaymentMethodId, string> = {
  WAVE: 'WAV',
  ORANGE_MONEY: 'OM',
  FREE_MONEY: 'FM',
  CARD: 'CB',
  CASH: 'ESP'
};

function buildReference(method: PaymentMethodId, seed: number): string {
  return `${METHOD_REF_PREFIX[method]}-${(80000 + seed * 137).toString().slice(-5)}`;
}

function buildHistory(row: SeedRow, id: string): TransactionHistoryEntry[] {
  const initiated: TransactionHistoryEntry = { timestamp: row.date, label: 'Paiement initié par le parent', status: 'PENDING' };
  const methodLabel = row.method === 'CASH' ? 'Enregistrement au bureau' : `Confirmation ${METHOD_REF_PREFIX[row.method]}`;

  if (row.status === 'SUCCESS' || row.status === 'REFUNDED') {
    const confirmed: TransactionHistoryEntry = { timestamp: row.date, label: `${methodLabel} reçue`, status: 'SUCCESS' };
    if (row.status === 'REFUNDED') {
      return [initiated, confirmed, { timestamp: row.date, label: `Remboursement exécuté — ${id}`, status: 'REFUNDED' }];
    }
    return [initiated, confirmed];
  }
  if (row.status === 'FAILED') {
    return [initiated, { timestamp: row.date, label: `${methodLabel} refusée par la passerelle`, status: 'FAILED' }];
  }
  if (row.status === 'CANCELLED') {
    return [initiated, { timestamp: row.date, label: 'Paiement annulé par le parent avant confirmation', status: 'CANCELLED' }];
  }
  return [initiated];
}

/**
 * The seed data only records one payment per row, not the fee's full billing history.
 * Tuition ("Scolarité") is billed in two tranches, so a single payment plausibly settles
 * about half of it; one-off fees (inscription, cantine, transport, autres) are billed and
 * paid in a single shot. This keeps "Solde restant" meaningful on the receipt without
 * having to hand-author a running balance for every row.
 */
function computeFeeTotals(row: SeedRow): { feeTotalAmount: number; paidToDate: number } {
  if (row.category === 'SCOLARITE') {
    return { feeTotalAmount: Math.round(row.amount * 2), paidToDate: row.amount };
  }
  return { feeTotalAmount: row.amount, paidToDate: row.amount };
}

function buildTransactionId(date: string, seq: number): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `TXN-${y}${m}${day}-${String(1000 + seq).slice(-4)}`;
}

function buildTransactions(): TransactionRecord[] {
  return SEED_ROWS.map((row, i) => {
    const student = STUDENTS[row.studentIdx];
    const id = buildTransactionId(row.date, i);
    const { feeTotalAmount, paidToDate } = computeFeeTotals(row);
    return {
      id,
      date: row.date,
      studentId: student.id,
      studentName: student.fullName,
      studentClass: student.classLevel,
      studentMatricule: student.matricule,
      parentName: student.parentName,
      parentEmail: student.parentEmail,
      parentPhone: student.parentPhone,
      feeCategory: row.category,
      feeLabel: row.label,
      amount: row.amount,
      feeTotalAmount,
      paidToDate,
      method: row.method,
      status: row.status,
      reference: buildReference(row.method, i + 1),
      history: buildHistory(row, id)
    };
  });
}

@Injectable({ providedIn: 'root' })
export class TransactionsService {
  private readonly transactions = signal<TransactionRecord[]>(buildTransactions());

  readonly students = STUDENTS;

  readonly search = signal('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly studentFilter = signal<string>('ALL');
  readonly parentFilter = signal<string>('ALL');
  readonly methodFilter = signal<PaymentMethodId | FilterAll>('ALL');
  readonly statusFilter = signal<TransactionStatus | FilterAll>('ALL');
  readonly categoryFilter = signal<FeeCategory | FilterAll>('ALL');
  readonly sortField = signal<SortField>('date');
  readonly sortDir = signal<SortDir>('desc');
  readonly page = signal(1);

  readonly pageSize = PAGE_SIZE;

  readonly availableParents = computed(() => Array.from(new Set(STUDENTS.map((s) => s.parentName))).sort());

  readonly filteredSorted = computed(() => {
    const term = this.search().trim().toLowerCase();
    const from = this.dateFrom();
    const to = this.dateTo();
    const student = this.studentFilter();
    const parent = this.parentFilter();
    const method = this.methodFilter();
    const status = this.statusFilter();
    const category = this.categoryFilter();
    const field = this.sortField();
    const dir = this.sortDir();

    let result = this.transactions().filter((tx) => {
      if (
        term &&
        !(
          tx.id.toLowerCase().includes(term) ||
          tx.studentName.toLowerCase().includes(term) ||
          tx.parentName.toLowerCase().includes(term) ||
          tx.reference.toLowerCase().includes(term)
        )
      ) {
        return false;
      }
      if (from && tx.date.slice(0, 10) < from) return false;
      if (to && tx.date.slice(0, 10) > to) return false;
      if (student !== 'ALL' && tx.studentId !== student) return false;
      if (parent !== 'ALL' && tx.parentName !== parent) return false;
      if (method !== 'ALL' && tx.method !== method) return false;
      if (status !== 'ALL' && tx.status !== status) return false;
      if (category !== 'ALL' && tx.feeCategory !== category) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (field === 'date') cmp = a.date.localeCompare(b.date);
      if (field === 'studentName') cmp = a.studentName.localeCompare(b.studentName, 'fr');
      if (field === 'amount') cmp = a.amount - b.amount;
      return dir === 'asc' ? cmp : -cmp;
    });

    return result;
  });

  readonly resultCount = computed(() => this.filteredSorted().length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.resultCount() / this.pageSize)));

  readonly pagedTransactions = computed(() => {
    const page = Math.min(this.page(), this.totalPages());
    const start = (page - 1) * this.pageSize;
    return this.filteredSorted().slice(start, start + this.pageSize);
  });

  readonly activeFilterCount = computed(() => {
    let n = 0;
    if (this.dateFrom() || this.dateTo()) n++;
    if (this.studentFilter() !== 'ALL') n++;
    if (this.parentFilter() !== 'ALL') n++;
    if (this.methodFilter() !== 'ALL') n++;
    if (this.statusFilter() !== 'ALL') n++;
    if (this.categoryFilter() !== 'ALL') n++;
    return n;
  });

  getById(id: string): TransactionRecord | undefined {
    return this.transactions().find((tx) => tx.id === id);
  }

  /** Unfiltered by design — a student's payment history shouldn't depend on whatever filters are active on the transactions list page. */
  getByStudentId(studentId: string): TransactionRecord[] {
    return this.transactions()
      .filter((tx) => tx.studentId === studentId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  setSearch(v: string): void {
    this.search.set(v);
    this.page.set(1);
  }
  setDateFrom(v: string): void {
    this.dateFrom.set(v);
    this.page.set(1);
  }
  setDateTo(v: string): void {
    this.dateTo.set(v);
    this.page.set(1);
  }
  setStudentFilter(v: string): void {
    this.studentFilter.set(v);
    this.page.set(1);
  }
  setParentFilter(v: string): void {
    this.parentFilter.set(v);
    this.page.set(1);
  }
  setMethodFilter(v: PaymentMethodId | FilterAll): void {
    this.methodFilter.set(v);
    this.page.set(1);
  }
  setStatusFilter(v: TransactionStatus | FilterAll): void {
    this.statusFilter.set(v);
    this.page.set(1);
  }
  setCategoryFilter(v: FeeCategory | FilterAll): void {
    this.categoryFilter.set(v);
    this.page.set(1);
  }

  resetFilters(): void {
    this.dateFrom.set('');
    this.dateTo.set('');
    this.studentFilter.set('ALL');
    this.parentFilter.set('ALL');
    this.methodFilter.set('ALL');
    this.statusFilter.set('ALL');
    this.categoryFilter.set('ALL');
    this.page.set(1);
  }

  toggleSort(field: SortField): void {
    if (this.sortField() === field) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortField.set(field);
      this.sortDir.set(field === 'date' || field === 'amount' ? 'desc' : 'asc');
    }
  }

  goToPage(n: number): void {
    this.page.set(Math.min(Math.max(1, n), this.totalPages()));
  }

  /** Registers a payment completed elsewhere (e.g. the parent payment wizard) as a real transaction. */
  addTransaction(input: Omit<TransactionRecord, 'id' | 'history'>): TransactionRecord {
    const id = buildTransactionId(input.date, this.transactions().length);
    const record: TransactionRecord = {
      ...input,
      id,
      history: [
        { timestamp: input.date, label: 'Paiement initié par le parent', status: 'PENDING' },
        { timestamp: input.date, label: `Confirmation ${METHOD_REF_PREFIX[input.method]} reçue`, status: 'SUCCESS' }
      ]
    };
    this.transactions.update((list) => [record, ...list]);
    return record;
  }

  refund(id: string): void {
    this.transactions.update((list) =>
      list.map((tx) =>
        tx.id === id
          ? {
              ...tx,
              status: 'REFUNDED' as TransactionStatus,
              history: [...tx.history, { timestamp: new Date().toISOString(), label: `Remboursement exécuté — ${id}`, status: 'REFUNDED' as TransactionStatus }]
            }
          : tx
      )
    );
  }
}
