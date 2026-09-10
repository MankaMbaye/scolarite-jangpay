package com.scolarite.backend.jangpay.payment;

public enum PaymentMethod {
    WAVE,
    ORANGE_MONEY,
    FREE_MONEY,
    CARD,
    /** No external gateway: settled in person and confirmed by staff, never by a webhook. */
    CASH
}
