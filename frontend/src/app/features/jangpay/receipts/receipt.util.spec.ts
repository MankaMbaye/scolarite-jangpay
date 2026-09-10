import { receiptNumberFor, qrPayloadFor } from './receipt.util';
import { TransactionRecord } from '../models/jangpay.models';

function makeTransaction(overrides: Partial<TransactionRecord> = {}): TransactionRecord {
  return {
    id: 'TXN-20260828-1007',
    date: '2026-08-28T09:12:00',
    studentId: 'std-1',
    studentName: 'Aminata Ndiaye',
    studentClass: 'CM2',
    studentMatricule: 'ELV-2026-0142',
    parentName: 'Fatou Ndiaye',
    parentEmail: 'fatou.ndiaye@example.sn',
    parentPhone: '+221 77 123 45 67',
    feeCategory: 'SCOLARITE',
    feeLabel: 'Scolarité — Tranche 2',
    amount: 45000,
    feeTotalAmount: 90000,
    paidToDate: 45000,
    method: 'WAVE',
    status: 'SUCCESS',
    reference: 'WAV-12345',
    history: [],
    ...overrides
  };
}

describe('receipt.util', () => {
  describe('génération du numéro de reçu', () => {
    it('dérive le numéro de reçu de l’année et des 4 derniers caractères de l’id de transaction', () => {
      const tx = makeTransaction();
      expect(receiptNumberFor(tx)).toBe('REC-2026-1007');
    });

    it('reflète l’année de la date de la transaction, pas l’année courante', () => {
      const tx = makeTransaction({ date: '2024-01-05T10:00:00', id: 'TXN-20240105-0042' });
      expect(receiptNumberFor(tx)).toBe('REC-2024-0042');
    });
  });

  describe('QR code du reçu', () => {
    it('encode uniquement l’id et la référence de la transaction', () => {
      const tx = makeTransaction();
      expect(qrPayloadFor(tx)).toBe('JANGPAY|TXN-20260828-1007|WAV-12345');
    });

    it('ne jamais exposer de données sensibles (nom, téléphone, email, montant)', () => {
      const tx = makeTransaction();
      const payload = qrPayloadFor(tx);
      expect(payload).not.toContain(tx.studentName);
      expect(payload).not.toContain(tx.parentName);
      expect(payload).not.toContain(tx.parentPhone);
      expect(payload).not.toContain(tx.parentEmail);
      expect(payload).not.toContain(String(tx.amount));
    });
  });
});
