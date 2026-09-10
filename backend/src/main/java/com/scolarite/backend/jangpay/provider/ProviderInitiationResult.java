package com.scolarite.backend.jangpay.provider;

/** What a provider hands back right after `initiate()` — never a final SUCCESS, only an acknowledgement. */
public record ProviderInitiationResult(
        String externalReference,
        ProviderTransactionStatus status,
        String message
) {
}
