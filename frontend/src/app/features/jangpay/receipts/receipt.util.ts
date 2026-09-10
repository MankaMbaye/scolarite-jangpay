import { TransactionRecord } from '../models/jangpay.models';

/**
 * The receipt number and QR payload are derived from the transaction, not stored data —
 * there is no backend receipt record yet (see README note in receipt-view.component.ts).
 */
export function receiptNumberFor(tx: TransactionRecord): string {
  const year = tx.date.slice(0, 4);
  return `REC-${year}-${tx.id.slice(-4)}`;
}

/**
 * Deliberately minimal: only enough to look the transaction up and confirm it matches this
 * reference. No personal data (name, phone, email) or amount is encoded in the QR code.
 */
export function qrPayloadFor(tx: TransactionRecord): string {
  return `JANGPAY|${tx.id}|${tx.reference}`;
}
