package com.scolarite.backend.jangpay.provider;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Stands in for every real gateway during development: no API key, no real money, no network call.
 * {@code initiate()} always comes back PENDING — never SUCCESS — and the confirmation arrives a few
 * seconds later exactly the way a real webhook would, through {@link SandboxPaymentSettledEvent}.
 * This is the ONLY provider wired up by default (see {@link PaymentProviderRegistry}); switching a
 * method to a real gateway later is a registry change, not a change to {@code PaymentService}.
 */
@Component
public class MockSandboxPaymentProvider implements PaymentProvider {

    private static final Logger log = LoggerFactory.getLogger(MockSandboxPaymentProvider.class);

    private final ApplicationEventPublisher events;
    private final WebhookSignatureVerifier signatureVerifier;
    private final String webhookSecret;
    private final long settleDelayMs;

    private final Map<String, ProviderTransactionStatus> sandboxLedger = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "jangpay-sandbox-settlement");
        t.setDaemon(true);
        return t;
    });

    public MockSandboxPaymentProvider(
            ApplicationEventPublisher events,
            WebhookSignatureVerifier signatureVerifier,
            @Value("${app.payments.sandbox.webhook-secret}") String webhookSecret,
            @Value("${app.payments.sandbox.settle-delay-ms:2500}") long settleDelayMs) {
        this.events = events;
        this.signatureVerifier = signatureVerifier;
        this.webhookSecret = webhookSecret;
        this.settleDelayMs = settleDelayMs;
    }

    @Override
    public ProviderInitiationResult initiate(PaymentInitiationRequest request) {
        String externalReference = "SBX-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase();
        sandboxLedger.put(externalReference, ProviderTransactionStatus.PENDING);
        log.info("[sandbox] initiated payment={} externalReference={} amount={}", request.paymentId(), externalReference, request.amount());

        scheduler.schedule(() -> settle(externalReference), settleDelayMs, TimeUnit.MILLISECONDS);

        return new ProviderInitiationResult(externalReference, ProviderTransactionStatus.PENDING, "Awaiting sandbox confirmation");
    }

    private void settle(String externalReference) {
        sandboxLedger.put(externalReference, ProviderTransactionStatus.SUCCEEDED);
        log.info("[sandbox] auto-settled externalReference={} -> SUCCEEDED", externalReference);
        events.publishEvent(new SandboxPaymentSettledEvent(
                this,
                new ProviderEvent(externalReference, ProviderTransactionStatus.SUCCEEDED, "Sandbox auto-confirmation")
        ));
    }

    @Override
    public ProviderEvent checkStatus(String externalReference) {
        ProviderTransactionStatus status = sandboxLedger.getOrDefault(externalReference, ProviderTransactionStatus.PENDING);
        return new ProviderEvent(externalReference, status, "Sandbox status check");
    }

    /**
     * Expects {@code {"externalReference": "...", "status": "SUCCEEDED"|"FAILED"|"CANCELLED", "message": "..."}}
     * signed with HMAC-SHA256 over the raw body, hex-encoded in the {@code X-Sandbox-Signature} header.
     *
     * <p>Parsed by hand rather than pulling in a JSON library for three fixed string fields — a real
     * provider's payload is richer and would use whatever JSON mapper is already wired up for it.
     */
    @Override
    public ProviderEvent handleWebhook(String rawPayload, Map<String, String> headers) {
        String signature = headers.get("x-sandbox-signature");
        if (!signatureVerifier.isValid(rawPayload, signature, webhookSecret)) {
            log.warn("[sandbox] rejected webhook: invalid signature");
            throw new InvalidWebhookSignatureException("Invalid sandbox webhook signature");
        }
        try {
            String externalReference = requireField(rawPayload, "externalReference");
            ProviderTransactionStatus status = ProviderTransactionStatus.valueOf(requireField(rawPayload, "status"));
            String message = optionalField(rawPayload, "message");
            sandboxLedger.put(externalReference, status);
            return new ProviderEvent(externalReference, status, message);
        } catch (Exception e) {
            throw new IllegalArgumentException("Malformed sandbox webhook payload", e);
        }
    }

    private String requireField(String json, String field) {
        String value = optionalField(json, field);
        if (value == null) {
            throw new IllegalArgumentException("Missing field: " + field);
        }
        return value;
    }

    /** {@code field} is always one of our own fixed literal names — never attacker-controlled. */
    private String optionalField(String json, String field) {
        Pattern pattern = Pattern.compile("\"" + field + "\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"");
        Matcher matcher = pattern.matcher(json);
        return matcher.find() ? matcher.group(1) : null;
    }
}
