export type FeeCategory = 'INSCRIPTION' | 'SCOLARITE' | 'TRANSPORT' | 'CANTINE' | 'AUTRES';

export const FEE_CATEGORY_LABELS: Record<FeeCategory, string> = {
  INSCRIPTION: 'Inscription',
  SCOLARITE: 'Scolarité',
  TRANSPORT: 'Transport',
  CANTINE: 'Cantine',
  AUTRES: 'Autres'
};

export type FeeStatus = 'SOLDEE' | 'PARTIELLE' | 'EN_ATTENTE' | 'EN_RETARD';

export const FEE_STATUS_LABELS: Record<FeeStatus, string> = {
  SOLDEE: 'Soldée',
  PARTIELLE: 'Partielle',
  EN_ATTENTE: 'En attente',
  EN_RETARD: 'En retard'
};

export interface Student {
  id: string;
  fullName: string;
  matricule: string;
  classLevel: string;
  academicYear: string;
  initials: string;
}

export interface FeeItem {
  id: string;
  studentId: string;
  category: FeeCategory;
  totalAmount: number;
  paidAmount: number;
  dueDate: string;
  status: FeeStatus;
}

export type PaymentMethodId = 'WAVE' | 'ORANGE_MONEY' | 'FREE_MONEY' | 'CARD' | 'CASH';

export interface PaymentMethodOption {
  id: PaymentMethodId;
  label: string;
  description: string;
  accent: string;
  /** Path to the provider's real logo (public/logos), when we have one — falls back to the accent-colored dot otherwise. */
  logo?: string;
}

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: 'WAVE', label: 'Wave', description: 'Paiement mobile instantané', accent: '#2FA7E0', logo: '/logos/wave.png' },
  { id: 'ORANGE_MONEY', label: 'Orange Money', description: 'Paiement mobile instantané', accent: '#FF7A00', logo: '/logos/orange-money.svg' },
  { id: 'FREE_MONEY', label: 'Free Money', description: 'Paiement mobile instantané', accent: '#E0325C' },
  { id: 'CARD', label: 'Carte bancaire', description: 'Visa, Mastercard', accent: '#45516B' },
  { id: 'CASH', label: 'Espèces', description: 'À régler au bureau de l’établissement', accent: '#A97142' }
];

export type PaymentResultStatus = 'SUCCESS' | 'PENDING' | 'FAILED' | 'CANCELLED';

export interface PaymentResult {
  status: PaymentResultStatus;
  transactionRef: string;
  studentName: string;
  amount: number;
  paidAt: string;
  methodLabel: string;
}

export const SCHOOL_CLASSES = [
  'CI',
  'CP',
  'CE1',
  'CE2',
  'CM1',
  'CM2',
  '6ème',
  '5ème',
  '4ème',
  '3ème',
  '2nde',
  '1ère',
  'Terminale'
];

export const ALL_CLASSES = 'Toutes les classes';

export interface SchoolCycle {
  label: string;
  classes: string[];
}

/** Groups SCHOOL_CLASSES into the standard French schooling cycles, used to narrow a class search by level first. */
export const SCHOOL_CYCLES: SchoolCycle[] = [
  { label: 'Primaire', classes: ['CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'] },
  { label: 'Collège', classes: ['6ème', '5ème', '4ème', '3ème'] },
  { label: 'Lycée', classes: ['2nde', '1ère', 'Terminale'] }
];

export type FeeDefinitionStatus = 'ACTIVE' | 'INACTIVE';

export const FEE_DEFINITION_STATUS_LABELS: Record<FeeDefinitionStatus, string> = {
  ACTIVE: 'Actif',
  INACTIVE: 'Inactif'
};

export interface FeeDefinition {
  id: string;
  name: string;
  category: FeeCategory;
  description: string;
  amount: number;
  academicYear: string;
  classLevel: string;
  startDate: string;
  dueDate: string;
  status: FeeDefinitionStatus;
  mandatory: boolean;
  createdAt: string;
}

export type TransactionStatus = 'SUCCESS' | 'PENDING' | 'FAILED' | 'CANCELLED' | 'REFUNDED';

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  SUCCESS: 'Réussi',
  PENDING: 'En attente',
  FAILED: 'Échoué',
  CANCELLED: 'Annulé',
  REFUNDED: 'Remboursé'
};

export function transactionStatusTone(status: TransactionStatus): string {
  switch (status) {
    case 'SUCCESS':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'FAILED':
      return 'critical';
    case 'REFUNDED':
      return 'info';
    default:
      return 'neutral';
  }
}

export interface TransactionHistoryEntry {
  timestamp: string;
  label: string;
  status: TransactionStatus;
}

export interface TransactionRecord {
  id: string;
  date: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  studentMatricule: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  feeCategory: FeeCategory;
  feeLabel: string;
  amount: number;
  /** Total amount due for the fee this payment applies to (may exceed `amount` for a partial/tranche payment). */
  feeTotalAmount: number;
  /** Cumulative amount paid on that fee as of this transaction (includes `amount`). */
  paidToDate: number;
  method: PaymentMethodId;
  status: TransactionStatus;
  reference: string;
  history: TransactionHistoryEntry[];
}

export const TENANT_INFO = {
  name: 'Groupe Scolaire Baobab',
  address: 'Route de Ouakam, Dakar, Sénégal',
  phone: '+221 33 820 45 12',
  email: 'contact@groupescolairebaobab.sn'
};

/** Splits a "Prénom [Prénom2] Nom" full name into { firstName, lastName }, taking the last word as the family name. */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

/**
 * Intl's fr-FR grouping separator is a narrow no-break space (U+202F) — under
 * `font-variant-numeric: tabular-nums` (used wherever amounts render, e.g. `.num`), some fonts
 * widen it to a full digit-width, making "45 000 XOF" read as if it had a doubled gap. Normalizing
 * every non-breaking space to a plain space keeps the amount visually consistent everywhere.
 */
export function formatXof(amount: number): string {
  const grouped = new Intl.NumberFormat('fr-FR').format(Math.round(amount)).replace(/[  ]/g, ' ');
  return `${grouped} XOF`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(iso));
}
