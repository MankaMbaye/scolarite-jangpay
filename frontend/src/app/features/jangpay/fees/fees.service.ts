import { Injectable, computed, signal } from '@angular/core';
import { ALL_CLASSES, FeeCategory, FeeDefinition, FeeDefinitionStatus } from '../models/jangpay.models';

export type SortField = 'name' | 'amount' | 'dueDate';
export type SortDir = 'asc' | 'desc';
export type FilterAll = 'ALL';

const PAGE_SIZE = 6;

const MOCK_FEES: FeeDefinition[] = [
  { id: 'fd-1', name: "Frais d'inscription", category: 'INSCRIPTION', description: "Frais unique payé à l'inscription ou la réinscription de l'élève.", amount: 25000, academicYear: '2026-2027', classLevel: ALL_CLASSES, startDate: '2026-08-01', dueDate: '2026-09-01', status: 'ACTIVE', mandatory: true, createdAt: '2026-06-01' },
  { id: 'fd-2', name: 'Scolarité CM2', category: 'SCOLARITE', description: 'Frais de scolarité annuels pour le niveau CM2.', amount: 120000, academicYear: '2026-2027', classLevel: 'CM2', startDate: '2026-09-01', dueDate: '2026-09-15', status: 'ACTIVE', mandatory: true, createdAt: '2026-06-01' },
  { id: 'fd-3', name: 'Scolarité CM1', category: 'SCOLARITE', description: 'Frais de scolarité annuels pour le niveau CM1.', amount: 110000, academicYear: '2026-2027', classLevel: 'CM1', startDate: '2026-09-01', dueDate: '2026-09-15', status: 'ACTIVE', mandatory: true, createdAt: '2026-06-01' },
  { id: 'fd-4', name: 'Scolarité 6ème', category: 'SCOLARITE', description: 'Frais de scolarité annuels pour le niveau 6ème.', amount: 90000, academicYear: '2026-2027', classLevel: '6ème', startDate: '2026-09-01', dueDate: '2026-09-15', status: 'ACTIVE', mandatory: true, createdAt: '2026-06-01' },
  { id: 'fd-5', name: 'Scolarité 5ème', category: 'SCOLARITE', description: 'Frais de scolarité annuels pour le niveau 5ème.', amount: 90000, academicYear: '2026-2027', classLevel: '5ème', startDate: '2026-09-01', dueDate: '2026-09-15', status: 'ACTIVE', mandatory: true, createdAt: '2026-06-01' },
  { id: 'fd-6', name: 'Scolarité Terminale', category: 'SCOLARITE', description: 'Frais de scolarité annuels pour le niveau Terminale.', amount: 150000, academicYear: '2026-2027', classLevel: 'Terminale', startDate: '2026-09-01', dueDate: '2026-09-15', status: 'ACTIVE', mandatory: true, createdAt: '2026-06-01' },
  { id: 'fd-7', name: 'Transport scolaire', category: 'TRANSPORT', description: 'Ramassage scolaire, zone standard.', amount: 20000, academicYear: '2026-2027', classLevel: ALL_CLASSES, startDate: '2026-09-01', dueDate: '2026-09-15', status: 'ACTIVE', mandatory: false, createdAt: '2026-06-01' },
  { id: 'fd-8', name: 'Transport scolaire — zone étendue', category: 'TRANSPORT', description: 'Ramassage scolaire pour les quartiers hors zone standard.', amount: 30000, academicYear: '2026-2027', classLevel: ALL_CLASSES, startDate: '2026-09-01', dueDate: '2026-09-15', status: 'ACTIVE', mandatory: false, createdAt: '2026-06-01' },
  { id: 'fd-9', name: 'Cantine', category: 'CANTINE', description: 'Repas de midi, du lundi au vendredi.', amount: 15000, academicYear: '2026-2027', classLevel: ALL_CLASSES, startDate: '2026-09-01', dueDate: '2026-09-01', status: 'ACTIVE', mandatory: false, createdAt: '2026-06-01' },
  { id: 'fd-10', name: "Frais d'examen blanc", category: 'AUTRES', description: 'Organisation des examens blancs de fin d’année.', amount: 10000, academicYear: '2026-2027', classLevel: 'Terminale', startDate: '2027-03-01', dueDate: '2027-03-15', status: 'ACTIVE', mandatory: true, createdAt: '2026-06-01' },
  { id: 'fd-11', name: 'Frais de bibliothèque', category: 'AUTRES', description: "Accès à la bibliothèque et prêt d'ouvrages.", amount: 5000, academicYear: '2026-2027', classLevel: ALL_CLASSES, startDate: '2026-09-01', dueDate: '2026-10-01', status: 'ACTIVE', mandatory: false, createdAt: '2026-06-01' },
  { id: 'fd-12', name: 'Uniforme scolaire', category: 'AUTRES', description: 'Kit uniforme complet (à la demande, non reconduit cette année).', amount: 12000, academicYear: '2026-2027', classLevel: ALL_CLASSES, startDate: '2026-08-01', dueDate: '2026-09-01', status: 'INACTIVE', mandatory: false, createdAt: '2026-06-01' },
  { id: 'fd-13', name: 'Scolarité CM2', category: 'SCOLARITE', description: 'Frais de scolarité annuels pour le niveau CM2 (année précédente).', amount: 110000, academicYear: '2025-2026', classLevel: 'CM2', startDate: '2025-09-01', dueDate: '2025-09-15', status: 'INACTIVE', mandatory: true, createdAt: '2025-06-01' },
  { id: 'fd-14', name: 'Cantine', category: 'CANTINE', description: 'Repas de midi, du lundi au vendredi (année précédente).', amount: 14000, academicYear: '2025-2026', classLevel: ALL_CLASSES, startDate: '2025-09-01', dueDate: '2025-09-01', status: 'INACTIVE', mandatory: false, createdAt: '2025-06-01' }
];

@Injectable({ providedIn: 'root' })
export class FeesService {
  private readonly fees = signal<FeeDefinition[]>(MOCK_FEES);

  readonly search = signal('');
  readonly typeFilter = signal<FeeCategory | FilterAll>('ALL');
  readonly classFilter = signal<string>('ALL');
  readonly yearFilter = signal<string>('ALL');
  readonly statusFilter = signal<FeeDefinitionStatus | FilterAll>('ALL');
  readonly sortField = signal<SortField>('name');
  readonly sortDir = signal<SortDir>('asc');
  readonly page = signal(1);

  readonly pageSize = PAGE_SIZE;

  readonly availableYears = computed(() => Array.from(new Set(this.fees().map((f) => f.academicYear))).sort().reverse());
  readonly availableClasses = computed(() => Array.from(new Set(this.fees().map((f) => f.classLevel))).sort());

  readonly filteredSorted = computed(() => {
    const term = this.search().trim().toLowerCase();
    const type = this.typeFilter();
    const cls = this.classFilter();
    const year = this.yearFilter();
    const status = this.statusFilter();
    const field = this.sortField();
    const dir = this.sortDir();

    let result = this.fees().filter((fee) => {
      if (term && !fee.name.toLowerCase().includes(term)) return false;
      if (type !== 'ALL' && fee.category !== type) return false;
      if (cls !== 'ALL' && fee.classLevel !== cls) return false;
      if (year !== 'ALL' && fee.academicYear !== year) return false;
      if (status !== 'ALL' && fee.status !== status) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (field === 'name') cmp = a.name.localeCompare(b.name, 'fr');
      if (field === 'amount') cmp = a.amount - b.amount;
      if (field === 'dueDate') cmp = a.dueDate.localeCompare(b.dueDate);
      return dir === 'asc' ? cmp : -cmp;
    });

    return result;
  });

  readonly resultCount = computed(() => this.filteredSorted().length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.resultCount() / this.pageSize)));

  readonly pagedFees = computed(() => {
    const page = Math.min(this.page(), this.totalPages());
    const start = (page - 1) * this.pageSize;
    return this.filteredSorted().slice(start, start + this.pageSize);
  });

  setSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }
  setTypeFilter(value: FeeCategory | FilterAll): void {
    this.typeFilter.set(value);
    this.page.set(1);
  }
  setClassFilter(value: string): void {
    this.classFilter.set(value);
    this.page.set(1);
  }
  setYearFilter(value: string): void {
    this.yearFilter.set(value);
    this.page.set(1);
  }
  setStatusFilter(value: FeeDefinitionStatus | FilterAll): void {
    this.statusFilter.set(value);
    this.page.set(1);
  }

  toggleSort(field: SortField): void {
    if (this.sortField() === field) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
    }
  }

  goToPage(n: number): void {
    this.page.set(Math.min(Math.max(1, n), this.totalPages()));
  }

  addFee(input: Omit<FeeDefinition, 'id' | 'createdAt'>): void {
    const fee: FeeDefinition = { ...input, id: 'fd-' + Date.now(), createdAt: new Date().toISOString() };
    this.fees.update((list) => [fee, ...list]);
  }

  updateFee(id: string, input: Omit<FeeDefinition, 'id' | 'createdAt'>): void {
    this.fees.update((list) => list.map((f) => (f.id === id ? { ...f, ...input } : f)));
  }

  toggleStatus(id: string): void {
    this.fees.update((list) =>
      list.map((f) => (f.id === id ? { ...f, status: f.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : f))
    );
  }

  deleteFee(id: string): void {
    this.fees.update((list) => list.filter((f) => f.id !== id));
  }
}
