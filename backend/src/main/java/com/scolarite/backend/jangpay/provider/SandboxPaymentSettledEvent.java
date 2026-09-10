package com.scolarite.backend.jangpay.provider;

import org.springframework.context.ApplicationEvent;

/**
 * Published by {@link MockSandboxPaymentProvider} once its simulated delay elapses, standing in for
 * a real gateway's webhook call. {@code PaymentService} listens for this the same way it would
 * handle an authenticated inbound webhook — same idempotency and locking rules apply either way.
 */
public class SandboxPaymentSettledEvent extends ApplicationEvent {

    private final ProviderEvent providerEvent;

    public SandboxPaymentSettledEvent(Object source, ProviderEvent providerEvent) {
        super(source);
        this.providerEvent = providerEvent;
    }

    public ProviderEvent providerEvent() {
        return providerEvent;
    }
}
