import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import * as QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { TransactionsService } from '../../transactions/transactions.service';
import { MethodBadgeComponent } from '../../shared/ui/method-badge/method-badge.component';
import { receiptNumberFor, qrPayloadFor } from '../receipt.util';
import {
  FEE_CATEGORY_LABELS,
  PAYMENT_METHODS,
  TENANT_INFO,
  TRANSACTION_STATUS_LABELS,
  TransactionStatus,
  formatDate,
  formatDateTime,
  formatXof,
  splitFullName
} from '../../models/jangpay.models';

/**
 * Receipts are generated client-side for now: the JangPay backend (Invoice/Payment/Receipt
 * entities from the architecture doc) doesn't exist yet, so there is nowhere to render a PDF
 * server-side or persist a receipt number. This component is built so that swapping in a real
 * `GET /api/jangpay/payments/{id}/receipt` later only means replacing `TransactionsService`
 * and the two functions in `receipt.util.ts` — the view and PDF layout stay the same.
 */
@Component({
  selector: 'app-receipt-view',
  standalone: true,
  imports: [MethodBadgeComponent],
  templateUrl: './receipt-view.component.html',
  styleUrl: './receipt-view.component.scss'
})
export class ReceiptViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly tx = inject(TransactionsService);

  readonly categoryLabels = FEE_CATEGORY_LABELS;
  readonly statusLabels = TRANSACTION_STATUS_LABELS;
  readonly methods = PAYMENT_METHODS;
  readonly tenant = TENANT_INFO;
  readonly formatXof = formatXof;
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly splitFullName = splitFullName;

  readonly transactionId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly transaction = this.tx.getById(this.transactionId) ?? null;

  readonly receiptEligible = computed(() => {
    const status = this.transaction?.status;
    return status === 'SUCCESS' || status === 'REFUNDED';
  });

  readonly receiptNumber = this.transaction ? receiptNumberFor(this.transaction) : '';
  readonly remaining = this.transaction ? Math.max(0, this.transaction.feeTotalAmount - this.transaction.paidToDate) : 0;
  readonly methodOf = this.transaction ? this.methods.find((m) => m.id === this.transaction!.method) : undefined;

  readonly qrDataUrl = signal<string | null>(null);
  readonly generatingPdf = signal(false);

  async ngOnInit(): Promise<void> {
    if (!this.transaction || !this.receiptEligible()) return;
    try {
      const dataUrl = await QRCode.toDataURL(qrPayloadFor(this.transaction), {
        width: 168,
        margin: 1,
        color: { dark: '#10192B', light: '#FFFFFF' }
      });
      this.qrDataUrl.set(dataUrl);
    } catch {
      this.qrDataUrl.set(null);
    }
  }

  statusTone(status: TransactionStatus): string {
    switch (status) {
      case 'SUCCESS':
        return 'success';
      case 'REFUNDED':
        return 'info';
      default:
        return 'neutral';
    }
  }

  print(): void {
    window.print();
  }

  goBack(): void {
    this.location.back();
  }

  async downloadPdf(): Promise<void> {
    const t = this.transaction;
    if (!t) return;
    this.generatingPdf.set(true);

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const marginX = 48;
    let y = 56;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor('#2F5FE0');
    doc.text('JANGERP EDUCATION', marginX, y);
    doc.setFontSize(18);
    doc.setTextColor('#10192B');
    y += 22;
    doc.text('JangPay — Reçu de paiement', marginX, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor('#45516B');
    y += 20;
    doc.text(this.tenant.name, marginX, y);
    y += 13;
    doc.text(`${this.tenant.address}`, marginX, y);
    y += 13;
    doc.text(`${this.tenant.phone} · ${this.tenant.email}`, marginX, y);

    doc.setDrawColor('#E5E9F2');
    y += 14;
    doc.line(marginX, y, 547, y);

    // jsPDF's standard fonts don't have a glyph for the narrow no-break space that
    // Intl.NumberFormat('fr-FR') uses as a thousands separator — normalize it to a
    // plain space so amounts don't render with a stray "/" in their place.
    const pdfSafe = (text: string) => text.replace(/[  ]/g, ' ');

    const heading = (text: string) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor('#1F3FA0');
      doc.text(text, marginX, y);
      y += 22;
    };

    const field = (label: string, value: string) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor('#8791A8');
      doc.text(label.toUpperCase(), marginX, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor('#10192B');
      doc.text(pdfSafe(value), marginX, y + 14);
      y += 34;
    };

    y += 30;
    heading('Informations transaction');

    const { firstName, lastName } = splitFullName(t.studentName);

    field('Numéro de reçu', this.receiptNumber);
    field('Numéro de transaction', t.id);
    field('Date', formatDateTime(t.date));

    heading('Informations élève');
    field('Nom', lastName);
    field('Prénom', firstName);
    field('Matricule', t.studentMatricule);
    field('Classe', t.studentClass);

    heading('Informations parent');
    field('Nom', t.parentName);
    field('Téléphone', t.parentPhone);

    heading('Paiement');
    field('Type de frais', t.feeLabel);
    field('Montant réglé', formatXof(t.amount));
    field('Moyen de paiement', this.methodOf?.label ?? '');
    field('Montant payé (cumulé)', formatXof(t.paidToDate));
    field('Solde restant', formatXof(this.remaining));

    doc.setFillColor(t.status === 'SUCCESS' ? '#E3F6ED' : '#EEF2FE');
    doc.setDrawColor(t.status === 'SUCCESS' ? '#1E9E6B' : '#2F5FE0');
    doc.roundedRect(marginX, y, 220, 28, 4, 4, 'FD');
    doc.setTextColor(t.status === 'SUCCESS' ? '#1E9E6B' : '#1F3FA0');
    doc.setFontSize(11);
    doc.text(t.status === 'SUCCESS' ? 'PAIEMENT RÉUSSI' : this.statusLabels[t.status].toUpperCase(), marginX + 12, y + 18);

    const qr = this.qrDataUrl();
    if (qr) {
      doc.addImage(qr, 'PNG', 420, y - 10, 84, 84);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor('#8791A8');
    doc.text('Reçu généré électroniquement par JangPay — ne contient aucune donnée de carte bancaire.', marginX, 780);

    doc.save(`${this.receiptNumber}.pdf`);
    this.generatingPdf.set(false);
  }
}
