package com.scolarite.backend.jangpay.payment;

import com.scolarite.backend.common.TenantAwareEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/** An immutable audit trail entry — every meaningful transition a payment goes through, once each. */
@Entity
@Table(name = "payment_events")
@Getter
@Setter
public class PaymentEvent extends TenantAwareEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "payment_id", nullable = false, updatable = false)
    private UUID paymentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private PaymentStatus status;

    @Column(nullable = false, updatable = false)
    private String message;

    /** Where this event came from: "system", "sandbox-webhook", "wave-webhook", a staff user id, ... */
    @Column(nullable = false, updatable = false)
    private String source;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
