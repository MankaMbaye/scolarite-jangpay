package com.scolarite.backend.jangpay.payment.dto;

import com.scolarite.backend.jangpay.payment.Payment;
import com.scolarite.backend.jangpay.payment.PaymentMethod;
import com.scolarite.backend.jangpay.payment.PaymentStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentResponse(
        UUID id,
        String reference,
        UUID studentId,
        String feeLabel,
        BigDecimal amount,
        String currency,
        PaymentMethod method,
        PaymentStatus status,
        Instant createdAt,
        Instant updatedAt
) {
    public static PaymentResponse from(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getReference(),
                payment.getStudentId(),
                payment.getFeeLabel(),
                payment.getAmount(),
                payment.getCurrency(),
                payment.getMethod(),
                payment.getStatus(),
                payment.getCreatedAt(),
                payment.getUpdatedAt()
        );
    }
}
