package com.scolarite.backend.jangpay.provider;

/** Thrown when a webhook's signature doesn't match — the payload must not be trusted. */
public class InvalidWebhookSignatureException extends RuntimeException {
    public InvalidWebhookSignatureException(String message) {
        super(message);
    }
}
