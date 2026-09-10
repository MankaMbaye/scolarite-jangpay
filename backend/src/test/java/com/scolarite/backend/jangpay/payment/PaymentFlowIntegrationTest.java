package com.scolarite.backend.jangpay.payment;

import com.scolarite.backend.auth.AuthResponse;
import com.scolarite.backend.auth.LoginRequest;
import com.scolarite.backend.auth.RegisterTenantRequest;
import com.scolarite.backend.jangpay.payment.dto.InitiatePaymentRequest;
import com.scolarite.backend.jangpay.payment.dto.PaymentResponse;
import com.scolarite.backend.jangpay.provider.ProviderEvent;
import com.scolarite.backend.jangpay.provider.ProviderTransactionStatus;
import com.scolarite.backend.user.Role;
import com.scolarite.backend.user.User;
import com.scolarite.backend.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.*;

@AutoConfigureTestRestTemplate
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:h2:mem:paymentflow;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.payments.sandbox.settle-delay-ms=300",
        "app.payments.sandbox.webhook-secret=test-webhook-secret"
})
class PaymentFlowIntegrationTest {

    @LocalServerPort
    int port;

    @Autowired
    TestRestTemplate rest;

    @Autowired
    PaymentService paymentService;

    @Autowired
    PaymentRepository paymentRepository;

    @Autowired
    PaymentEventRepository paymentEventRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder passwordEncoder;

    private String adminToken;
    private UUID tenantId;
    private String tenantCode;

    @BeforeEach
    void registerFreshTenant() {
        tenantCode = "ecole-test-" + UUID.randomUUID().toString().substring(0, 8);
        var request = new RegisterTenantRequest(
                "École de test", tenantCode, "Admin Test", tenantCode + "@test.sn", "password123"
        );
        ResponseEntity<AuthResponse> response = rest.postForEntity(url("/api/auth/register-tenant"), request, AuthResponse.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        adminToken = response.getBody().token();
        tenantId = response.getBody().tenantId();
    }

    /** Inserts a user directly (no self-service registration endpoint exists for non-admin roles) and logs them in. */
    private String loginAs(Role role) {
        String email = role.name().toLowerCase() + "-" + UUID.randomUUID().toString().substring(0, 8) + "@test.sn";
        String rawPassword = "password123";

        User user = new User();
        user.setTenantId(tenantId);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setFullName(role.name() + " Test");
        user.setRole(role);
        userRepository.save(user);

        var loginRequest = new LoginRequest(tenantCode, email, rawPassword);
        ResponseEntity<AuthResponse> response = rest.postForEntity(url("/api/auth/login"), loginRequest, AuthResponse.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        return response.getBody().token();
    }

    @Test
    void initiate_withoutIdempotencyKey_isRejected() {
        var body = new InitiatePaymentRequest(UUID.randomUUID(), "Scolarité — Tranche 1", BigDecimal.valueOf(45000), PaymentMethod.WAVE, null);
        HttpHeaders headers = authHeaders(adminToken);
        ResponseEntity<String> response = rest.exchange(
                RequestEntity.post(url("/api/jangpay/payments/initiate")).headers(headers).body(body),
                String.class
        );
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void initiate_startsPending_andSandboxSettlesToSuccessOnlyAfterConfirmation() {
        PaymentResponse created = initiate(PaymentMethod.WAVE, "PAY-KEY-" + UUID.randomUUID());

        // The rule under test: never SUCCESS straight out of initiate — only PENDING.
        assertEquals(PaymentStatus.PENDING, created.status());

        PaymentResponse settled = waitUntil(() -> getPayment(created.id()), p -> p.status() == PaymentStatus.SUCCESS, 3000);
        assertEquals(PaymentStatus.SUCCESS, settled.status());

        List<PaymentEvent> events = paymentEventRepository.findByPaymentIdOrderByCreatedAtAsc(created.id());
        assertEquals(2, events.size());
        assertEquals(PaymentStatus.PENDING, events.get(0).getStatus());
        assertEquals(PaymentStatus.SUCCESS, events.get(1).getStatus());
    }

    @Test
    void initiate_isIdempotent_onRepeatedKey() {
        long countBefore = paymentRepository.count();
        String key = "PAY-KEY-" + UUID.randomUUID();
        PaymentResponse first = initiate(PaymentMethod.ORANGE_MONEY, key);
        PaymentResponse second = initiate(PaymentMethod.ORANGE_MONEY, key);

        assertEquals(first.id(), second.id());
        // Exactly one new row for two identical requests — the DB is shared across this class's
        // tests (same H2 instance, cached Spring context), so assert the delta, not an absolute count.
        assertEquals(countBefore + 1, paymentRepository.count());
    }

    @Test
    void applyProviderEvent_isIgnoredOncePaymentIsTerminal() {
        PaymentResponse created = initiate(PaymentMethod.FREE_MONEY, "PAY-KEY-" + UUID.randomUUID());
        waitUntil(() -> getPayment(created.id()), p -> p.status() == PaymentStatus.SUCCESS, 3000);

        Payment persisted = paymentRepository.findById(created.id()).orElseThrow();
        String externalReference = persisted.getExternalReference();
        assertNotNull(externalReference);

        // A duplicate/late webhook claiming FAILED must never override an already-settled SUCCESS.
        paymentService.applyProviderEvent(new ProviderEvent(externalReference, ProviderTransactionStatus.FAILED, "late duplicate"), "test-replay");

        PaymentResponse afterReplay = getPayment(created.id());
        assertEquals(PaymentStatus.SUCCESS, afterReplay.status());

        List<PaymentEvent> events = paymentEventRepository.findByPaymentIdOrderByCreatedAtAsc(created.id());
        assertEquals(2, events.size(), "the ignored replay must not add a third event");
    }

    @Test
    void cashPayment_staysPendingUntilStaffConfirms() {
        PaymentResponse created = initiate(PaymentMethod.CASH, "PAY-KEY-" + UUID.randomUUID());
        assertEquals(PaymentStatus.PENDING, created.status());

        ResponseEntity<PaymentResponse> confirmed = rest.exchange(
                RequestEntity.post(url("/api/jangpay/payments/" + created.id() + "/confirm-cash")).headers(authHeaders(adminToken)).build(),
                PaymentResponse.class
        );
        assertEquals(HttpStatus.OK, confirmed.getStatusCode());
        assertEquals(PaymentStatus.SUCCESS, confirmed.getBody().status());
    }

    @Test
    void refund_onlyAllowedFromSuccess() {
        PaymentResponse cash = initiate(PaymentMethod.CASH, "PAY-KEY-" + UUID.randomUUID());

        ResponseEntity<String> refundTooEarly = rest.exchange(
                RequestEntity.post(url("/api/jangpay/payments/" + cash.id() + "/refund")).headers(authHeaders(adminToken)).build(),
                String.class
        );
        assertEquals(HttpStatus.CONFLICT, refundTooEarly.getStatusCode());

        rest.exchange(RequestEntity.post(url("/api/jangpay/payments/" + cash.id() + "/confirm-cash")).headers(authHeaders(adminToken)).build(), Void.class);

        ResponseEntity<PaymentResponse> refunded = rest.exchange(
                RequestEntity.post(url("/api/jangpay/payments/" + cash.id() + "/refund")).headers(authHeaders(adminToken)).build(),
                PaymentResponse.class
        );
        assertEquals(HttpStatus.OK, refunded.getStatusCode());
        assertEquals(PaymentStatus.REFUNDED, refunded.getBody().status());
    }

    @Test
    void unauthenticatedRequest_isRejected() {
        var body = new InitiatePaymentRequest(UUID.randomUUID(), "Cantine", BigDecimal.valueOf(15000), PaymentMethod.WAVE, null);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Idempotency-Key", UUID.randomUUID().toString());
        ResponseEntity<String> response = rest.exchange(
                RequestEntity.post(url("/api/jangpay/payments/initiate")).headers(headers).body(body),
                String.class
        );
        assertTrue(response.getStatusCode().is4xxClientError());
    }

    @Test
    void webhook_rejectsInvalidSignature() {
        String payload = "{\"externalReference\":\"SBX-DOES-NOT-EXIST\",\"status\":\"SUCCEEDED\",\"message\":\"forged\"}";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Sandbox-Signature", "not-a-real-signature");

        ResponseEntity<String> response = rest.exchange(
                RequestEntity.post(url("/api/jangpay/webhooks/sandbox")).headers(headers).body(payload),
                String.class
        );
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    void initiate_rejectsZeroAndNegativeAmount() {
        HttpHeaders headers = authHeaders(adminToken);
        headers.set("Idempotency-Key", "PAY-KEY-" + UUID.randomUUID());
        var zeroBody = new InitiatePaymentRequest(UUID.randomUUID(), "Cantine", BigDecimal.ZERO, PaymentMethod.WAVE, null);
        ResponseEntity<String> zeroResponse = rest.exchange(
                RequestEntity.post(url("/api/jangpay/payments/initiate")).headers(headers).body(zeroBody),
                String.class
        );
        assertEquals(HttpStatus.BAD_REQUEST, zeroResponse.getStatusCode());

        headers.set("Idempotency-Key", "PAY-KEY-" + UUID.randomUUID());
        var negativeBody = new InitiatePaymentRequest(UUID.randomUUID(), "Cantine", BigDecimal.valueOf(-1000), PaymentMethod.WAVE, null);
        ResponseEntity<String> negativeResponse = rest.exchange(
                RequestEntity.post(url("/api/jangpay/payments/initiate")).headers(headers).body(negativeBody),
                String.class
        );
        assertEquals(HttpStatus.BAD_REQUEST, negativeResponse.getStatusCode());
    }

    @Test
    void getById_unknownTransaction_returns404() {
        ResponseEntity<String> response = rest.exchange(
                RequestEntity.get(url("/api/jangpay/payments/" + UUID.randomUUID())).headers(authHeaders(adminToken)).build(),
                String.class
        );
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void applyProviderEvent_transitionsToFailed() {
        PaymentResponse created = initiate(PaymentMethod.WAVE, "PAY-KEY-" + UUID.randomUUID());
        Payment persisted = paymentRepository.findById(created.id()).orElseThrow();
        String externalReference = persisted.getExternalReference();
        assertNotNull(externalReference);

        // Applied immediately, ahead of the sandbox's 300ms auto-settlement, to exercise a genuine
        // gateway-reported failure rather than the sandbox's default auto-success.
        paymentService.applyProviderEvent(new ProviderEvent(externalReference, ProviderTransactionStatus.FAILED, "Fonds insuffisants"), "test");

        PaymentResponse afterFailure = getPayment(created.id());
        assertEquals(PaymentStatus.FAILED, afterFailure.status());
    }

    @Test
    void cancel_pendingPayment_transitionsToCancelled() {
        PaymentResponse created = initiate(PaymentMethod.CASH, "PAY-KEY-" + UUID.randomUUID());
        assertEquals(PaymentStatus.PENDING, created.status());

        ResponseEntity<PaymentResponse> cancelled = rest.exchange(
                RequestEntity.post(url("/api/jangpay/payments/" + created.id() + "/cancel")).headers(authHeaders(adminToken)).build(),
                PaymentResponse.class
        );
        assertEquals(HttpStatus.OK, cancelled.getStatusCode());
        assertEquals(PaymentStatus.CANCELLED, cancelled.getBody().status());
    }

    @Test
    void confirmCash_onAlreadySettledPayment_isRejectedAsConflict() {
        PaymentResponse created = initiate(PaymentMethod.CASH, "PAY-KEY-" + UUID.randomUUID());
        rest.exchange(RequestEntity.post(url("/api/jangpay/payments/" + created.id() + "/confirm-cash")).headers(authHeaders(adminToken)).build(), Void.class);

        // "Transaction déjà payée" — a second confirmation on an already-SUCCESS payment must be rejected.
        ResponseEntity<String> secondConfirm = rest.exchange(
                RequestEntity.post(url("/api/jangpay/payments/" + created.id() + "/confirm-cash")).headers(authHeaders(adminToken)).build(),
                String.class
        );
        assertEquals(HttpStatus.CONFLICT, secondConfirm.getStatusCode());
    }

    @Test
    void initiate_withTwoDistinctIdempotencyKeys_createsTwoSeparateTransactions() {
        long countBefore = paymentRepository.count();
        PaymentResponse first = initiate(PaymentMethod.ORANGE_MONEY, "PAY-KEY-" + UUID.randomUUID());
        PaymentResponse second = initiate(PaymentMethod.ORANGE_MONEY, "PAY-KEY-" + UUID.randomUUID());

        assertNotEquals(first.id(), second.id());
        assertNotEquals(first.reference(), second.reference());
        assertEquals(countBefore + 2, paymentRepository.count());
    }

    @Test
    void parentRole_canInitiate_butCannotConfirmCashOrRefund() {
        String parentToken = loginAs(Role.PARENT);

        var body = new InitiatePaymentRequest(UUID.randomUUID(), "Cantine", BigDecimal.valueOf(15000), PaymentMethod.CASH, null);
        HttpHeaders headers = authHeaders(parentToken);
        headers.set("Idempotency-Key", "PAY-KEY-" + UUID.randomUUID());
        ResponseEntity<PaymentResponse> initiated = rest.exchange(
                RequestEntity.post(url("/api/jangpay/payments/initiate")).headers(headers).body(body),
                PaymentResponse.class
        );
        assertEquals(HttpStatus.OK, initiated.getStatusCode());
        UUID paymentId = initiated.getBody().id();

        ResponseEntity<String> confirmAttempt = rest.exchange(
                RequestEntity.post(url("/api/jangpay/payments/" + paymentId + "/confirm-cash")).headers(authHeaders(parentToken)).build(),
                String.class
        );
        assertEquals(HttpStatus.FORBIDDEN, confirmAttempt.getStatusCode());

        ResponseEntity<String> refundAttempt = rest.exchange(
                RequestEntity.post(url("/api/jangpay/payments/" + paymentId + "/refund")).headers(authHeaders(parentToken)).build(),
                String.class
        );
        assertEquals(HttpStatus.FORBIDDEN, refundAttempt.getStatusCode());
    }

    @Test
    void accountantRole_canInitiateConfirmCashAndRefund() {
        String accountantToken = loginAs(Role.ACCOUNTANT);

        var body = new InitiatePaymentRequest(UUID.randomUUID(), "Scolarité", BigDecimal.valueOf(45000), PaymentMethod.CASH, null);
        HttpHeaders headers = authHeaders(accountantToken);
        headers.set("Idempotency-Key", "PAY-KEY-" + UUID.randomUUID());
        ResponseEntity<PaymentResponse> initiated = rest.exchange(
                RequestEntity.post(url("/api/jangpay/payments/initiate")).headers(headers).body(body),
                PaymentResponse.class
        );
        assertEquals(HttpStatus.OK, initiated.getStatusCode());
        UUID paymentId = initiated.getBody().id();

        ResponseEntity<PaymentResponse> confirmed = rest.exchange(
                RequestEntity.post(url("/api/jangpay/payments/" + paymentId + "/confirm-cash")).headers(authHeaders(accountantToken)).build(),
                PaymentResponse.class
        );
        assertEquals(HttpStatus.OK, confirmed.getStatusCode());
        assertEquals(PaymentStatus.SUCCESS, confirmed.getBody().status());

        ResponseEntity<PaymentResponse> refunded = rest.exchange(
                RequestEntity.post(url("/api/jangpay/payments/" + paymentId + "/refund")).headers(authHeaders(accountantToken)).build(),
                PaymentResponse.class
        );
        assertEquals(HttpStatus.OK, refunded.getStatusCode());
        assertEquals(PaymentStatus.REFUNDED, refunded.getBody().status());
    }

    private PaymentResponse initiate(PaymentMethod method, String idempotencyKey) {
        var body = new InitiatePaymentRequest(UUID.randomUUID(), "Scolarité — Tranche 1", BigDecimal.valueOf(45000), method, "+221771234567");
        HttpHeaders headers = authHeaders(adminToken);
        headers.set("Idempotency-Key", idempotencyKey);
        ResponseEntity<PaymentResponse> response = rest.exchange(
                RequestEntity.post(url("/api/jangpay/payments/initiate")).headers(headers).body(body),
                PaymentResponse.class
        );
        assertEquals(HttpStatus.OK, response.getStatusCode());
        return response.getBody();
    }

    private PaymentResponse getPayment(UUID id) {
        ResponseEntity<PaymentResponse> response = rest.exchange(
                RequestEntity.get(url("/api/jangpay/payments/" + id)).headers(authHeaders(adminToken)).build(),
                PaymentResponse.class
        );
        return response.getBody();
    }

    private HttpHeaders authHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    private <T> T waitUntil(Supplier<T> poll, java.util.function.Predicate<T> condition, long timeoutMs) {
        long deadline = System.currentTimeMillis() + timeoutMs;
        T last = null;
        while (System.currentTimeMillis() < deadline) {
            last = poll.get();
            if (condition.test(last)) {
                return last;
            }
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException(e);
            }
        }
        fail("Condition not met within " + timeoutMs + "ms, last value: " + last);
        return last;
    }
}
