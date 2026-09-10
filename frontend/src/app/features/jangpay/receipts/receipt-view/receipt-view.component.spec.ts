import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ReceiptViewComponent } from './receipt-view.component';
import { TransactionsService } from '../../transactions/transactions.service';

function routeFor(id: string) {
  return { snapshot: { paramMap: convertToParamMap({ id }) } };
}

/**
 * The component reads the route param and looks up the transaction in its constructor field
 * initializers, so both TransactionsService and ActivatedRoute must be provided up front — an
 * `inject(TransactionsService)` before `overrideProvider(ActivatedRoute, ...)` locks the module.
 */
function setUpFor(id: string, seed: TransactionsService): void {
  TestBed.configureTestingModule({
    imports: [ReceiptViewComponent],
    providers: [
      { provide: TransactionsService, useValue: seed },
      { provide: ActivatedRoute, useValue: routeFor(id) }
    ]
  });
}

describe('ReceiptViewComponent — génération et éligibilité du reçu', () => {
  it('un paiement réussi (SUCCESS) est éligible au reçu', () => {
    const seed = new TransactionsService();
    const created = seed.addTransaction({
      date: new Date().toISOString(),
      studentId: 'std-1',
      studentName: 'Aminata Ndiaye',
      studentClass: 'CM2',
      studentMatricule: 'ELV-2026-0142',
      parentName: 'Fatou Ndiaye',
      parentEmail: 'fatou.ndiaye@example.sn',
      parentPhone: '+221 77 123 45 67',
      feeCategory: 'CANTINE',
      feeLabel: 'Cantine',
      amount: 15000,
      feeTotalAmount: 15000,
      paidToDate: 15000,
      method: 'CASH',
      status: 'SUCCESS',
      reference: 'ESP-11111'
    });
    setUpFor(created.id, seed);

    const fixture = TestBed.createComponent(ReceiptViewComponent);
    expect(fixture.componentInstance.receiptEligible()).toBeTrue();
  });

  it('un remboursement (REFUNDED) reste éligible au reçu', () => {
    const seed = new TransactionsService();
    const target = seed.filteredSorted().find((t) => t.status === 'SUCCESS')!;
    seed.refund(target.id);
    setUpFor(target.id, seed);

    const fixture = TestBed.createComponent(ReceiptViewComponent);
    expect(fixture.componentInstance.receiptEligible()).toBeTrue();
  });

  it('un paiement en attente (PENDING) n’est pas éligible au reçu', () => {
    const seed = new TransactionsService();
    const pending = seed.filteredSorted().find((t) => t.status === 'PENDING')!;
    setUpFor(pending.id, seed);

    const fixture = TestBed.createComponent(ReceiptViewComponent);
    expect(fixture.componentInstance.receiptEligible()).toBeFalse();
  });

  it('un paiement échoué (FAILED) n’est pas éligible au reçu', () => {
    const seed = new TransactionsService();
    const failed = seed.filteredSorted().find((t) => t.status === 'FAILED')!;
    setUpFor(failed.id, seed);

    const fixture = TestBed.createComponent(ReceiptViewComponent);
    expect(fixture.componentInstance.receiptEligible()).toBeFalse();
  });

  it('transaction inconnue : aucune transaction chargée, pas d’éligibilité', () => {
    const seed = new TransactionsService();
    setUpFor('TXN-INCONNUE-0000', seed);

    const fixture = TestBed.createComponent(ReceiptViewComponent);
    expect(fixture.componentInstance.transaction).toBeNull();
    expect(fixture.componentInstance.receiptEligible()).toBeFalse();
  });
});
