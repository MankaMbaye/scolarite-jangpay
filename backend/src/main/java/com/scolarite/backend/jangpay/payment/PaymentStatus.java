package com.scolarite.backend.jangpay.payment;

public enum PaymentStatus {
    PENDING,
    SUCCESS,
    FAILED,
    CANCELLED,
    REFUNDED;

    /** A payment in one of these states will never move again on its own. */
    public boolean isTerminal() {
        return this == SUCCESS || this == FAILED || this == CANCELLED || this == REFUNDED;
    }
}
