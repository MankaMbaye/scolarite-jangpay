package com.scolarite.backend.jangpay.provider;

import java.math.BigDecimal;
import java.util.UUID;

/** What JangPay asks a provider to do: start collecting one payment. */
public record PaymentInitiationRequest(
        UUID paymentId,
        String reference,
        BigDecimal amount,
        String currency,
        String payerPhone
) {
}
