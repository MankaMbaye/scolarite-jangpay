package com.scolarite.backend.jangpay.provider;

/**
 * The payment gateway's own view of a transaction — deliberately separate from
 * {@link com.scolarite.backend.jangpay.payment.PaymentStatus}: this is what the provider says,
 * the domain status is what JangPay decides after applying its own rules.
 */
public enum ProviderTransactionStatus {
    PENDING,
    SUCCEEDED,
    FAILED,
    CANCELLED
}
