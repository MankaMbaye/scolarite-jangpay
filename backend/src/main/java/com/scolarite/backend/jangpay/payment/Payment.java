package com.scolarite.backend.jangpay.payment;

import com.scolarite.backend.common.TenantAwareEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * The internal ledger truth for one payment attempt. Only {@code PaymentService} may change
 * {@link #status} — and only ever to SUCCESS after the provider (or, for cash, a staff member)
 * has actually confirmed it; nothing here is ever taken on the payer's word alone.
 */
@Entity
@Table(
        name = "payments",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_payments_reference", columnNames = "reference"),
                @UniqueConstraint(name = "uk_payments_idempotency", columnNames = {"tenant_id", "idempotency_key"})
        }
)
@Getter
@Setter
public class Payment extends TenantAwareEntity {

    @Id
    @GeneratedValue
    private UUID id;

    /** Human-facing transaction reference, unique across every tenant. */
    @Column(nullable = false, updatable = false)
    private String reference;

    /** Caller-supplied key that makes repeated "initiate" calls for the same attempt idempotent. */
    @Column(name = "idempotency_key", nullable = false, updatable = false)
    private String idempotencyKey;

    @Column(name = "student_id", nullable = false, updatable = false)
    private UUID studentId;

    @Column(name = "initiated_by_user_id", nullable = false, updatable = false)
    private UUID initiatedByUserId;

    @Column(name = "fee_label", nullable = false, updatable = false)
    private String feeLabel;

    @Column(nullable = false, updatable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, updatable = false, length = 3)
    private String currency = "XOF";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private PaymentMethod method;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status = PaymentStatus.PENDING;

    /** The provider's own reference for this attempt — null until `initiate()` returns (or never, for cash). */
    @Column(name = "external_reference")
    private String externalReference;

    /** Guards against two concurrent status updates (e.g. duplicate webhook deliveries) racing each other. */
    @Version
    private long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
