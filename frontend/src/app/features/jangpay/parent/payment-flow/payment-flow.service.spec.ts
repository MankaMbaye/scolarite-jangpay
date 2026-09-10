import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { PaymentFlowService } from './payment-flow.service';
import { TransactionsService } from '../../transactions/transactions.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthResponse } from '../../../../core/auth/auth.models';

function userWithRole(role: string): AuthResponse {
  return { token: 't', userId: 'u1', tenantId: 'tenant-1', role, fullName: 'Test User', email: 'test@example.sn' };
}

describe('PaymentFlowService', () => {
  let flow: PaymentFlowService;
  let tx: TransactionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PaymentFlowService, TransactionsService, provideHttpClient(), provideRouter([])]
    });
    flow = TestBed.inject(PaymentFlowService);
    tx = TestBed.inject(TransactionsService);
  });

  describe('sélection élève', () => {
    it('sélectionne un élève et charge ses frais', () => {
      flow.selectStudent('std-aminata');
      expect(flow.selectedStudent()?.fullName).toBe('Aminata Ndiaye');
      expect(flow.studentFees().length).toBeGreaterThan(0);
    });

    it('réinitialise les frais sélectionnés en changeant d’élève', () => {
      flow.selectStudent('std-aminata');
      flow.toggleFee('fee-a-2');
      expect(flow.selectedFeeIds().size).toBe(1);

      flow.selectStudent('std-moussa');
      expect(flow.selectedFeeIds().size).toBe(0);
      expect(flow.selectedStudent()?.fullName).toBe('Moussa Ndiaye');
    });

    it('étape "élève" invalide tant qu’aucun élève n’est choisi', () => {
      expect(flow.stepValid().student).toBeFalse();
    });
  });

  describe('sélection frais', () => {
    beforeEach(() => flow.selectStudent('std-aminata'));

    it('un élève avec plusieurs frais : la sélection additionne les montants', () => {
      flow.toggleFee('fee-a-2'); // Scolarité: total 120000, payé 65000
      flow.toggleFee('fee-a-3'); // Transport: total 20000, payé 0
      expect(flow.totalDue()).toBe(140000);
      expect(flow.totalPaid()).toBe(65000);
      expect(flow.totalRemaining()).toBe(75000);
    });

    it('un frais déjà soldé (solde à zéro) ne peut pas être sélectionné', () => {
      flow.toggleFee('fee-a-1'); // SOLDEE
      expect(flow.selectedFeeIds().size).toBe(0);
    });

    it('étape "frais" invalide tant qu’aucun frais n’est sélectionné (y compris élève sans frais choisi)', () => {
      expect(flow.stepValid().fees).toBeFalse();
    });

    it('re-cliquer un frais sélectionné le désélectionne', () => {
      flow.toggleFee('fee-a-3');
      expect(flow.selectedFeeIds().has('fee-a-3')).toBeTrue();
      flow.toggleFee('fee-a-3');
      expect(flow.selectedFeeIds().has('fee-a-3')).toBeFalse();
    });
  });

  describe('montant', () => {
    beforeEach(() => {
      flow.selectStudent('std-aminata');
      flow.toggleFee('fee-a-3'); // Transport: restant 20000
    });

    it('paiement complet règle exactement le solde restant', () => {
      flow.setPaymentType('complete');
      expect(flow.amountToPay()).toBe(20000);
      expect(flow.amountError()).toBeNull();
      expect(flow.stepValid().amount).toBeTrue();
    });

    it('paiement partiel valide dans les bornes', () => {
      flow.setPaymentType('partial');
      flow.setCustomAmount(5000);
      expect(flow.amountError()).toBeNull();
      expect(flow.stepValid().amount).toBeTrue();
    });

    it('paiement exact du solde restant (cas limite) est valide', () => {
      flow.setPaymentType('partial');
      flow.setCustomAmount(20000);
      expect(flow.amountError()).toBeNull();
    });

    it('montant invalide (zéro) est rejeté', () => {
      flow.setPaymentType('partial');
      flow.setCustomAmount(0);
      expect(flow.amountError()).toContain('supérieur à 0');
    });

    it('montant invalide (négatif) est rejeté', () => {
      flow.setPaymentType('partial');
      flow.setCustomAmount(-100);
      expect(flow.amountError()).toContain('supérieur à 0');
    });

    it('montant supérieur au solde restant (cas limite) est rejeté', () => {
      flow.setPaymentType('partial');
      flow.setCustomAmount(20001);
      expect(flow.amountError()).toContain('dépasser le solde');
    });

    it('montant vide est rejeté', () => {
      flow.setPaymentType('partial');
      flow.setCustomAmount(null);
      expect(flow.amountError()).not.toBeNull();
    });
  });

  describe('soumission du paiement', () => {
    function advanceToConfirmStep(): void {
      flow.selectStudent('std-aminata');
      flow.next(); // student -> fees
      flow.toggleFee('fee-a-3');
      flow.next(); // fees -> amount
      flow.setPaymentType('complete');
      flow.next(); // amount -> method
      flow.selectMethod('WAVE');
      flow.next(); // method -> confirm
      expect(flow.currentStep()).toBe('confirm');
    }

    function completeWizard(): void {
      advanceToConfirmStep();
      flow.setConfirmed(true);
    }

    it('paiement réussi : statut SUCCESS et transaction enregistrée', fakeAsync(() => {
      completeWizard();
      const before = tx.filteredSorted().length;

      flow.submitPayment();
      expect(flow.submitting()).toBeTrue();
      tick(1300);

      expect(flow.submitting()).toBeFalse();
      expect(flow.result()?.status).toBe('SUCCESS');
      expect(flow.currentStep()).toBe('result');
      expect(tx.filteredSorted().length).toBe(before + 1);
    }));

    it('ne se soumet pas sans confirmation de la case à cocher', () => {
      advanceToConfirmStep();
      // confirmed volontairement laissé à false

      flow.submitPayment();
      expect(flow.submitting()).toBeFalse();
      expect(flow.result()).toBeNull();
    });

    it('double soumission (double clic) ne crée qu’une seule transaction', fakeAsync(() => {
      completeWizard();
      const before = tx.filteredSorted().length;

      flow.submitPayment();
      flow.submitPayment(); // second appel avant la résolution du premier
      tick(1300);

      expect(tx.filteredSorted().length).toBe(before + 1);
    }));
  });

  describe('recherche niveau/classe (Comptable/Administrateur)', () => {
    it('un Parent ne voit pas la recherche : la liste reste ses propres enfants', () => {
      const auth = TestBed.inject(AuthService);
      auth.currentUser.set(userWithRole('PARENT'));

      expect(flow.isStaff()).toBeFalse();
      expect(flow.students().length).toBe(2);
    });

    it('un Comptable voit tout l’établissement, recherché par niveau puis classe', () => {
      const auth = TestBed.inject(AuthService);
      auth.currentUser.set(userWithRole('ACCOUNTANT'));

      expect(flow.isStaff()).toBeTrue();
      expect(flow.students().length).toBe(26);
      // Aucun résultat tant que niveau/classe ne sont pas choisis.
      expect(flow.filteredStudents().length).toBe(0);

      flow.setNiveauFilter('Collège');
      expect(flow.availableClasses()).toEqual(['6ème', '5ème', '4ème', '3ème']);
      expect(flow.filteredStudents().length).toBe(0);

      flow.setClasseFilter('6ème');
      const results = flow.filteredStudents();
      expect(results.length).toBe(2);
      expect(results.some((s) => s.fullName === 'Moussa Ndiaye')).toBeTrue();
    });

    it('chaque classe du répertoire a au moins un élève', () => {
      const auth = TestBed.inject(AuthService);
      auth.currentUser.set(userWithRole('ACCOUNTANT'));

      for (const cycle of ['Primaire', 'Collège', 'Lycée']) {
        flow.setNiveauFilter(cycle);
        for (const classe of flow.availableClasses()) {
          flow.setClasseFilter(classe);
          expect(flow.filteredStudents().length).withContext(`${cycle} / ${classe}`).toBeGreaterThan(0);
        }
      }
    });

    it('changer de niveau réinitialise la classe sélectionnée', () => {
      const auth = TestBed.inject(AuthService);
      auth.currentUser.set(userWithRole('TENANT_ADMIN'));

      flow.setNiveauFilter('Primaire');
      flow.setClasseFilter('CM2');
      expect(flow.classeFilter()).toBe('CM2');

      flow.setNiveauFilter('Lycée');
      expect(flow.classeFilter()).toBe('ALL');
      expect(flow.filteredStudents().length).toBe(0);
    });

    it('élève sans frais : un élève du répertoire peut n’avoir aucun frais en cours', () => {
      const auth = TestBed.inject(AuthService);
      auth.currentUser.set(userWithRole('ACCOUNTANT'));

      flow.setNiveauFilter('Lycée');
      flow.setClasseFilter('Terminale');
      const [student] = flow.filteredStudents();
      expect(student.fullName).toBe('Awa Fall');

      flow.selectStudent(student.id);
      expect(flow.studentFees().length).toBe(0);
      expect(flow.stepValid().fees).toBeFalse();
    });

    it('affiche l’historique des paiements d’un élève pour un Comptable', () => {
      const auth = TestBed.inject(AuthService);
      auth.currentUser.set(userWithRole('ACCOUNTANT'));

      flow.setNiveauFilter('Primaire');
      flow.setClasseFilter('CM2');
      const [aminata] = flow.filteredStudents();
      expect(aminata.fullName).toBe('Aminata Ndiaye');

      flow.selectStudent(aminata.id);
      const history = flow.selectedStudentHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history.every((t) => t.studentId === aminata.id)).toBeTrue();
    });

    it('n’affiche pas d’historique pour un Parent (portée réservée au personnel)', () => {
      const auth = TestBed.inject(AuthService);
      auth.currentUser.set(userWithRole('PARENT'));

      flow.selectStudent('std-aminata');
      expect(flow.selectedStudentHistory()).toEqual([]);
    });

    it('le paiement enregistré par un Comptable attribue le bon parent (pas celui du parent de démo)', fakeAsync(() => {
      const auth = TestBed.inject(AuthService);
      auth.currentUser.set(userWithRole('ACCOUNTANT'));

      flow.setNiveauFilter('Primaire');
      flow.setClasseFilter('CE2');
      const [cheikh] = flow.filteredStudents();
      expect(cheikh.fullName).toBe('Cheikh Diallo');

      flow.selectStudent(cheikh.id);
      flow.next();
      const [fee] = flow.studentFees();
      flow.toggleFee(fee.id);
      flow.next();
      flow.setPaymentType('complete');
      flow.next();
      flow.selectMethod('CASH');
      flow.next();
      flow.setConfirmed(true);

      flow.submitPayment();
      tick(1300);

      expect(flow.result()?.status).toBe('SUCCESS');
      const created = tx.filteredSorted()[0];
      expect(created.studentName).toBe('Cheikh Diallo');
      expect(created.parentName).toBe('Mariama Diallo');
    }));
  });
});
