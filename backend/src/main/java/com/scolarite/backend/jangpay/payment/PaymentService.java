package com.scolarite.backend.jangpay.payment;

import com.scolarite.backend.jangpay.payment.dto.InitiatePaymentRequest;
import com.scolarite.backend.jangpay.payment.dto.PaymentResponse;
import com.scolarite.backend.jangpay.provider.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.UUID;

/**
 * The single authority for what a payment's status is. Every path that could change a payment
 * (a real webhook, the sandbox's simulated one, staff confirming cash, a refund) funnels through
 * here so the same rules — idempotent by construction, SUCCESS only on real confirmation,
 * one event applied at most once — apply no matter where the change came from.
 */
@Service
@RequiredArgsConstructor
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository paymentRepository;
    private final PaymentEventRepository paymentEventRepository;
    private final PaymentProviderRegistry providerRegistry;
    private final TransactionReferenceGenerator referenceGenerator;

    @Transactional
    public PaymentResponse initiate(UUID tenantId, UUID initiatedByUserId, String idempotencyKey, InitiatePaymentRequest request) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Idempotency-Key header is required");
        }

        var existing = paymentRepository.findByTenantIdAndIdempotencyKey(tenantId, idempotencyKey);
        if (existing.isPresent()) {
            log.info("Idempotent replay: idempotencyKey={} already maps to payment={}", idempotencyKey, existing.get().getId());
            return PaymentResponse.from(existing.get());
        }

        Payment payment = new Payment();
        payment.setTenantId(tenantId);
        payment.setInitiatedByUserId(initiatedByUserId);
        payment.setIdempotencyKey(idempotencyKey);
        payment.setReference(referenceGenerator.generate());
        payment.setStudentId(request.studentId());
        payment.setFeeLabel(request.feeLabel());
        payment.setAmount(request.amount());
        payment.setMethod(request.method());
        payment.setStatus(PaymentStatus.PENDING);

        try {
            payment = paymentRepository.save(payment);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // Two concurrent requests with the same idempotency key raced past the check above;
            // the unique constraint caught it — treat the loser as a replay, not an error.
            return paymentRepository.findByTenantIdAndIdempotencyKey(tenantId, idempotencyKey)
                    .map(PaymentResponse::from)
                    .orElseThrow(() -> e);
        }

        recordEvent(payment, PaymentStatus.PENDING, "Paiement initié", "system");
        log.info("Payment initiated: reference={} tenant={} amount={} method={}", payment.getReference(), tenantId, payment.getAmount(), payment.getMethod());

        if (payment.getMethod() == PaymentMethod.CASH) {
            // No gateway round-trip: stays PENDING until an accountant confirms receipt in person.
            return PaymentResponse.from(payment);
        }

        PaymentProvider provider = providerRegistry.resolve(payment.getMethod());
        try {
            ProviderInitiationResult result = provider.initiate(new PaymentInitiationRequest(
                    payment.getId(), payment.getReference(), payment.getAmount(), payment.getCurrency(), request.payerPhone()
            ));
            payment.setExternalReference(result.externalReference());
            payment = paymentRepository.save(payment);
            log.info("Provider acknowledged payment={} externalReference={} providerStatus={}", payment.getId(), result.externalReference(), result.status());
        } catch (Exception e) {
            log.error("Provider initiation failed for payment={}: {}", payment.getId(), e.getMessage());
            payment.setStatus(PaymentStatus.FAILED);
            payment = paymentRepository.save(payment);
            recordEvent(payment, PaymentStatus.FAILED, "Échec à l'initiation côté passerelle : " + e.getMessage(), "system");
        }

        return PaymentResponse.from(payment);
    }

    /** Invoked by the sandbox provider's simulated delay, in lieu of a real inbound webhook call. */
    @EventListener
    @Transactional
    public void onSandboxSettlement(SandboxPaymentSettledEvent event) {
        applyProviderEvent(event.providerEvent(), "sandbox-webhook");
    }

    /** Invoked by {@code PaymentWebhookController} once the provider's signature has been verified. */
    @Transactional
    public void applyProviderEvent(ProviderEvent event, String source) {
        var paymentOpt = paymentRepository.findByExternalReference(event.externalReference());
        if (paymentOpt.isEmpty()) {
            log.warn("Ignoring provider event for unknown externalReference={} (source={})", event.externalReference(), source);
            return;
        }
        Payment payment = paymentOpt.get();

        if (payment.getStatus().isTerminal()) {
            log.info("Ignoring provider event for payment={}: already in terminal state {} (source={})", payment.getId(), payment.getStatus(), source);
            return;
        }

        PaymentStatus next = switch (event.status()) {
            case SUCCEEDED -> PaymentStatus.SUCCESS;
            case FAILED -> PaymentStatus.FAILED;
            case CANCELLED -> PaymentStatus.CANCELLED;
            case PENDING -> null; // nothing changed yet
        };
        if (next == null) {
            return;
        }

        try {
            payment.setStatus(next);
            paymentRepository.saveAndFlush(payment);
        } catch (ObjectOptimisticLockingFailureException e) {
            // Another thread (e.g. a duplicate webhook delivery) already applied this transition.
            log.info("Concurrent update detected for payment={}, skipping duplicate transition to {}", payment.getId(), next);
            return;
        }

        recordEvent(payment, next, event.message() != null ? event.message() : "Confirmation reçue de la passerelle (" + source + ")", source);
        log.info("Payment {} transitioned to {} (source={})", payment.getReference(), next, source);
    }

    @Transactional
    public PaymentResponse confirmCash(UUID paymentId, UUID staffUserId) {
        Payment payment = getPendingForMutation(paymentId);
        if (payment.getMethod() != PaymentMethod.CASH) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only cash payments can be confirmed manually");
        }
        payment.setStatus(PaymentStatus.SUCCESS);
        payment = paymentRepository.save(payment);
        recordEvent(payment, PaymentStatus.SUCCESS, "Encaissement en espèces confirmé", "staff:" + staffUserId);
        log.info("Cash payment {} confirmed by staff={}", payment.getReference(), staffUserId);
        return PaymentResponse.from(payment);
    }

    @Transactional
    public PaymentResponse cancel(UUID paymentId) {
        Payment payment = getPendingForMutation(paymentId);
        payment.setStatus(PaymentStatus.CANCELLED);
        payment = paymentRepository.save(payment);
        recordEvent(payment, PaymentStatus.CANCELLED, "Paiement annulé", "system");
        log.info("Payment {} cancelled", payment.getReference());
        return PaymentResponse.from(payment);
    }

    @Transactional
    public PaymentResponse refund(UUID paymentId, UUID staffUserId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));
        if (payment.getStatus() != PaymentStatus.SUCCESS) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only a successful payment can be refunded");
        }
        payment.setStatus(PaymentStatus.REFUNDED);
        payment = paymentRepository.save(payment);
        recordEvent(payment, PaymentStatus.REFUNDED, "Remboursement exécuté", "staff:" + staffUserId);
        log.info("Payment {} refunded by staff={}", payment.getReference(), staffUserId);
        return PaymentResponse.from(payment);
    }

    @Transactional(readOnly = true)
    public PaymentResponse getById(UUID paymentId) {
        return paymentRepository.findById(paymentId)
                .map(PaymentResponse::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));
    }

    private Payment getPendingForMutation(UUID paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));
        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Payment is not pending (current status: " + payment.getStatus() + ")");
        }
        return payment;
    }

    private void recordEvent(Payment payment, PaymentStatus status, String message, String source) {
        PaymentEvent event = new PaymentEvent();
        event.setTenantId(payment.getTenantId());
        event.setPaymentId(payment.getId());
        event.setStatus(status);
        event.setMessage(message);
        event.setSource(source);
        event.setCreatedAt(Instant.now());
        paymentEventRepository.save(event);
    }
}
