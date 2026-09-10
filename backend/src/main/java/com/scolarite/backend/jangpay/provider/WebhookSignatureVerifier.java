package com.scolarite.backend.jangpay.provider;

import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * HMAC-SHA256 verification shared by provider implementations. Real gateways each have their own
 * signature scheme (header name, encoding, what gets signed) — this covers the sandbox provider and
 * is the pattern a real one would follow, wired to that provider's documented scheme instead.
 */
@Component
public class WebhookSignatureVerifier {

    public boolean isValid(String rawPayload, String providedSignatureHex, String secret) {
        if (providedSignatureHex == null || providedSignatureHex.isBlank()) {
            return false;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] computed = mac.doFinal(rawPayload.getBytes(StandardCharsets.UTF_8));
            String computedHex = HexFormat.of().formatHex(computed);
            return MessageDigest.isEqual(
                    computedHex.getBytes(StandardCharsets.UTF_8),
                    providedSignatureHex.trim().toLowerCase().getBytes(StandardCharsets.UTF_8)
            );
        } catch (NoSuchAlgorithmException | java.security.InvalidKeyException e) {
            return false;
        }
    }
}
