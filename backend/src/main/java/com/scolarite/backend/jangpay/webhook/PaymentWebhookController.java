package com.scolarite.backend.jangpay.webhook;

import com.scolarite.backend.jangpay.payment.PaymentService;
import com.scolarite.backend.jangpay.provider.InvalidWebhookSignatureException;
import com.scolarite.backend.jangpay.provider.MockSandboxPaymentProvider;
import com.scolarite.backend.jangpay.provider.PaymentProvider;
import com.scolarite.backend.jangpay.provider.ProviderEvent;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Map;

/**
 * Server-to-server callbacks from payment gateways. Deliberately outside JWT authentication
 * (see {@code SecurityConfig}) — a gateway can't hold a JangPay user session — but every payload is
 * still authenticated, via its provider's own signature scheme, before anything in it is trusted.
 * A missing/invalid signature never reaches {@code PaymentService}.
 */
@RestController
@RequestMapping("/api/jangpay/webhooks")
public class PaymentWebhookController {

    private static final Logger log = LoggerFactory.getLogger(PaymentWebhookController.class);

    private final PaymentService paymentService;
    private final MockSandboxPaymentProvider sandboxPaymentProvider;

    public PaymentWebhookController(PaymentService paymentService, MockSandboxPaymentProvider sandboxPaymentProvider) {
        this.paymentService = paymentService;
        this.sandboxPaymentProvider = sandboxPaymentProvider;
    }

    @PostMapping("/sandbox")
    public ResponseEntity<Void> sandbox(@RequestBody String rawPayload, HttpServletRequest request) {
        return handle(sandboxPaymentProvider, "sandbox-webhook", rawPayload, request);
    }

    // Real providers each get their own endpoint + signature scheme once configured, e.g.:
    // @PostMapping("/wave") public ResponseEntity<Void> wave(@RequestBody String rawPayload, HttpServletRequest request) {
    //     return handle(waveProvider, "wave-webhook", rawPayload, request);
    // }

    private ResponseEntity<Void> handle(PaymentProvider provider, String source, String rawPayload, HttpServletRequest request) {
        try {
            ProviderEvent event = provider.handleWebhook(rawPayload, headersOf(request));
            paymentService.applyProviderEvent(event, source);
            return ResponseEntity.ok().build();
        } catch (InvalidWebhookSignatureException e) {
            log.warn("Rejected webhook from {}: {}", source, e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        } catch (IllegalArgumentException e) {
            log.warn("Malformed webhook from {}: {}", source, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    private Map<String, String> headersOf(HttpServletRequest request) {
        Map<String, String> headers = new HashMap<>();
        Enumeration<String> names = request.getHeaderNames();
        if (names == null) {
            return Collections.emptyMap();
        }
        while (names.hasMoreElements()) {
            String name = names.nextElement();
            headers.put(name.toLowerCase(), request.getHeader(name));
        }
        return headers;
    }
}
