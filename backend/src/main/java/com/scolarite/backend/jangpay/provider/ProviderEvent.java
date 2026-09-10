package com.scolarite.backend.jangpay.provider;

/** A confirmed fact reported by the provider — via webhook or an explicit status check. */
public record ProviderEvent(
        String externalReference,
        ProviderTransactionStatus status,
        String message
) {
}
