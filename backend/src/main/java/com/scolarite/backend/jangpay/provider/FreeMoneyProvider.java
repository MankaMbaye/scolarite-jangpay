package com.scolarite.backend.jangpay.provider;

import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Not wired up by default — see {@link WaveProvider}'s note; same pattern applies here with
 * {@code app.payments.free-money.*} configuration once real merchant credentials exist.
 */
@Component
public class FreeMoneyProvider implements PaymentProvider {

    private static final String NOT_CONFIGURED =
            "Free Money integration is not configured. Set app.payments.free-money.* and switch app.payments.mode to 'live' to enable it.";

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
