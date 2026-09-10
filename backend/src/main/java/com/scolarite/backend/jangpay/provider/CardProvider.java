package com.scolarite.backend.jangpay.provider;

import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Not wired up by default — see {@link WaveProvider}'s note. A real implementation would rely on a
 * PCI-compliant processor's hosted fields / tokenization: the browser talks to the processor
 * directly and JangPay only ever receives a token, never a card number, CVV or expiry date.
 */
@Component
public class CardProvider implements PaymentProvider {

    private static final String NOT_CONFIGURED =
            "Card payments are not configured. Set app.payments.card.* (a tokenizing processor) and switch app.payments.mode to 'live' to enable it.";

    @Override
    public ProviderInitiationResult initiate(PaymentInitiationRequest request) {
        throw new UnsupportedOperationException(NOT_CONFIGURED);
    }

    @Override
    public ProviderEvent checkStatus(String externalReference) {
        throw new UnsupportedOperationException(NOT_CONFIGURED);
    }

    @Override
    public ProviderEvent handleWebhook(String rawPayload, Map<String, String> headers) {
        throw new UnsupportedOperationException(NOT_CONFIGURED);
    }
}
