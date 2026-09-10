package com.scolarite.backend.jangpay.provider;

import java.util.Map;

/**
 * One implementation per payment method (Wave, Orange Money, Free Money, carte bancaire...), wired
 * to its {@code PaymentMethod} explicitly in {@link PaymentProviderRegistry} rather than self-declared
 * here — the sandbox provider stands in for several methods at once during development, so "one
 * provider instance = one method" isn't a safe assumption to bake into the interface.
 * {@code PaymentService} only ever talks to this interface — it never knows which real gateway is
 * behind it. Adding a new payment method later means writing one new implementation and registering
 * it in the registry; nothing else in the payment domain changes.
 *
 * <p>None of this ever sees a card number, CVV or expiry date: a card provider tokenizes on its own
 * hosted page and only ever hands JangPay a token/reference, per the "never store card data" rule.
 */
public interface PaymentProvider {

    /** Starts collecting the payment. Must return quickly — real confirmation always comes later. */
    ProviderInitiationResult initiate(PaymentInitiationRequest request);

    /** Actively asks the provider for the current status of a transaction it already knows about. */
    ProviderEvent checkStatus(String externalReference);

    /**
     * Parses and authenticates an inbound webhook call.
     *
     * @throws InvalidWebhookSignatureException if the payload's signature doesn't check out — the
     *         caller must treat this as untrusted and never apply the resulting status.
     */
    ProviderEvent handleWebhook(String rawPayload, Map<String, String> headers);
}
