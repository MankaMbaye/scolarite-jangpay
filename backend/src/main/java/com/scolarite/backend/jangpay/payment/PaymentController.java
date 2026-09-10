package com.scolarite.backend.jangpay.payment;

import com.scolarite.backend.jangpay.payment.dto.InitiatePaymentRequest;
import com.scolarite.backend.jangpay.payment.dto.PaymentResponse;
import com.scolarite.backend.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/jangpay/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/initiate")
    @PreAuthorize("hasAnyRole('PARENT', 'ACCOUNTANT', 'TENANT_ADMIN')")
    public ResponseEntity<PaymentResponse> initiate(
            @Valid @RequestBody InitiatePaymentRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        var principal = currentPrincipal();
        return ResponseEntity.ok(paymentService.initiate(principal.tenantId(), principal.userId(), idempotencyKey, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PaymentResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(paymentService.getById(id));
    }

    @PostMapping("/{id}/confirm-cash")
    @PreAuthorize("hasAnyRole('ACCOUNTANT', 'TENANT_ADMIN')")
    public ResponseEntity<PaymentResponse> confirmCash(@PathVariable UUID id) {
        return ResponseEntity.ok(paymentService.confirmCash(id, currentPrincipal().userId()));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<PaymentResponse> cancel(@PathVariable UUID id) {
        return ResponseEntity.ok(paymentService.cancel(id));
    }

    @PostMapping("/{id}/refund")
    @PreAuthorize("hasAnyRole('ACCOUNTANT', 'TENANT_ADMIN')")
    public ResponseEntity<PaymentResponse> refund(@PathVariable UUID id) {
        return ResponseEntity.ok(paymentService.refund(id, currentPrincipal().userId()));
    }

    private JwtService.TokenPrincipal currentPrincipal() {
        return (JwtService.TokenPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
