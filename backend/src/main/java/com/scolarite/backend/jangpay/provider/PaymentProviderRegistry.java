package com.scolarite.backend.jangpay.provider;

import com.scolarite.backend.jangpay.payment.PaymentMethod;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

/**
 * Resolves which {@link PaymentProvider} handles a given {@link PaymentMethod}.
 *
 * <p>In {@code sandbox} mode (the default, and the only supported mode until real merchant
 * credentials exist) every gateway-backed method resolves to {@link MockSandboxPaymentProvider} —
 * no API key, no real account, no money moves. Switching {@code app.payments.mode} to {@code live}
 * routes each method to its real implementation instead; nothing in {@code PaymentService} changes
 * either way. {@link PaymentMethod#CASH} never goes through a provider at all — it is confirmed by
 * staff, not a gateway.
 */
@Component
public class PaymentProviderRegistry {

    private final Map<PaymentMethod, PaymentProvider> providers = new EnumMap<>(PaymentMethod.class);

    public PaymentProviderRegistry(
            @Value("${app.payments.mode:sandbox}") String mode,
            MockSandboxPaymentProvider sandboxPaymentProvider,
            WaveProvider waveProvider,
            OrangeMoneyProvider orangeMoneyProvider,
            FreeMoneyProvider freeMoneyProvider,
            CardProvider cardProvider) {
        boolean sandbox = !"live".equalsIgnoreCase(mode);

        providers.put(PaymentMethod.WAVE, sandbox ? sandboxPaymentProvider : waveProvider);
        providers.put(PaymentMethod.ORANGE_MONEY, sandbox ? sandboxPaymentProvider : orangeMoneyProvider);
        providers.put(PaymentMethod.FREE_MONEY, sandbox ? sandboxPaymentProvider : freeMoneyProvider);
        providers.put(PaymentMethod.CARD, sandbox ? sandboxPaymentProvider : cardProvider);
    }

    public PaymentProvider resolve(PaymentMethod method) {
        PaymentProvider provider = providers.get(method);
        if (provider == null) {
            throw new IllegalArgumentException("No payment provider registered for method " + method);
        }
        return provider;
    }
}
