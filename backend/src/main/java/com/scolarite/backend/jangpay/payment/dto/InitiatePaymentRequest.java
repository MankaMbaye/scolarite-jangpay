package com.scolarite.backend.jangpay.payment.dto;

import com.scolarite.backend.jangpay.payment.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record InitiatePaymentRequest(
        @NotNull UUID studentId,
        @NotBlank String feeLabel,
        @NotNull @DecimalMin(value = "1", message = "amount must be greater than 0") BigDecimal amount,
        @NotNull PaymentMethod method,
        String payerPhone
) {
}
