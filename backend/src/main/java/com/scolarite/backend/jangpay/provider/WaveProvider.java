package com.scolarite.backend.jangpay.provider;

import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Not wired up by default (see {@link PaymentProviderRegistry} — sandbox mode routes here only if
 * explicitly switched on). A real implementation would call the Wave Checkout API using
 * {@code app.payments.wave.api-key} / {@code app.payments.wave.api-secret} from configuration
 * (never hard-coded), and verify each webhook against Wave's documented signature header.
 */
@Component
public class WaveProvider implements PaymentProvider {

    private static final String NOT_CONFIGURED =
            "Wave integration is not configured. Set app.payments.wave.* and switch app.payments.mode to 'live' to enable it.";

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
