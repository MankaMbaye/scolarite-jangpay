import { TestBed } from '@angular/core/testing';
import { TransactionsService } from './transactions.service';

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [TransactionsService] });
    service = TestBed.inject(TransactionsService);
  });

  it('ajoute une transaction (paiement réussi) et la place en tête de liste', () => {
    const before = service.filteredSorted().length;
    const created = service.addTransaction({
      date: new Date().toISOString(),
      studentId: 'std-1',
      studentName: 'Aminata Ndiaye',
      studentClass: 'CM2',
      studentMatricule: 'ELV-2026-0142',
      parentName: 'Fatou Ndiaye',
      parentEmail: 'fatou.ndiaye@example.sn',
      parentPhone: '+221 77 123 45 67',
      feeCategory: 'TRANSPORT',
      feeLabel: 'Transport scolaire',
      amount: 20000,
      feeTotalAmount: 20000,
      paidToDate: 20000,
      method: 'WAVE',
      status: 'SUCCESS',
      reference: 'WAV-99999'
    });

    expect(service.filteredSorted().length).toBe(before + 1);
    expect(service.filteredSorted()[0].id).toBe(created.id);
    expect(created.history.length).toBe(2);
    expect(created.history.at(-1)?.status).toBe('SUCCESS');
  });

  it('paiement échoué : une transaction FAILED existe dans le jeu de données et reste consultable', () => {
    service.setStatusFilter('FAILED');
    const failed = service.filteredSorted();
    expect(failed.length).toBeGreaterThan(0);
    expect(failed.every((t) => t.status === 'FAILED')).toBeTrue();
  });

  it('paiement en attente : une transaction PENDING existe et reste consultable', () => {
    service.setStatusFilter('PENDING');
    const pending = service.filteredSorted();
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.every((t) => t.status === 'PENDING')).toBeTrue();
  });

  it('remboursement : fait passer le statut à REFUNDED et journalise l’historique', () => {
    const target = service.filteredSorted().find((t) => t.status === 'SUCCESS')!;
    service.refund(target.id);
    const updated = service.getById(target.id);
    expect(updated?.status).toBe('REFUNDED');
    expect(updated?.history.at(-1)?.status).toBe('REFUNDED');
  });

  it('transaction déjà remboursée : un second remboursement ne casse rien et reste REFUNDED', () => {
    const target = service.filteredSorted().find((t) => t.status === 'SUCCESS')!;
    service.refund(target.id);
    service.refund(target.id);
    expect(service.getById(target.id)?.status).toBe('REFUNDED');
  });

  it('transaction inconnue : getById retourne undefined', () => {
    expect(service.getById('TXN-INEXISTANTE-0000')).toBeUndefined();
  });

  it('la recherche filtre par nom d’élève, parent ou référence', () => {
    const first = service.filteredSorted()[0];
    service.setSearch(first.studentName);
    expect(service.filteredSorted().every((t) => t.studentName === first.studentName || t.parentName === first.studentName)).toBeTrue();
  });

  it('un filtre combiné sans résultat retourne une liste vide (cas limite)', () => {
    service.setSearch('aucune-correspondance-xyz');
    expect(service.filteredSorted().length).toBe(0);
    expect(service.pagedTransactions().length).toBe(0);
    expect(service.totalPages()).toBe(1);
  });

  it('le tri par montant respecte la direction demandée', () => {
    service.toggleSort('amount');
    service.toggleSort('amount');
    const amounts = service.filteredSorted().map((t) => t.amount);
    const sorted = [...amounts].sort((a, b) => a - b);
    expect(amounts).toEqual(sorted);
  });

  describe('historique par élève', () => {
    it('retourne uniquement les paiements de cet élève, triés du plus récent au plus ancien', () => {
      const history = service.getByStudentId('std-1');
      expect(history.length).toBeGreaterThan(0);
      expect(history.every((t) => t.studentId === 'std-1')).toBeTrue();

      const dates = history.map((t) => t.date);
      const sortedDesc = [...dates].sort((a, b) => b.localeCompare(a));
      expect(dates).toEqual(sortedDesc);
    });

    it('élève sans historique : retourne une liste vide', () => {
      expect(service.getByStudentId('std-inexistant')).toEqual([]);
    });

    it('ignore les filtres actifs de la page Transactions (toujours la liste complète de l’élève)', () => {
      service.setSearch('ce-nom-n-existe-pas-xyz');
      const history = service.getByStudentId('std-1');
      expect(history.length).toBeGreaterThan(0);
    });
  });
});
