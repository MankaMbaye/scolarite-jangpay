package com.scolarite.backend.jangpay.payment;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/** Produces short, human-readable, collision-checked transaction references such as {@code PAY-20260829-K3F9QX}. */
@Component
public class TransactionReferenceGenerator {

    private static final DateTimeFormatter DATE_PATTERN = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity
    private static final int SUFFIX_LENGTH = 6;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final PaymentRepository paymentRepository;

    public TransactionReferenceGenerator(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    public String generate() {
        String datePart = LocalDate.now().format(DATE_PATTERN);
        for (int attempt = 0; attempt < 10; attempt++) {
            String candidate = "PAY-" + datePart + "-" + randomSuffix();
            if (!paymentRepository.existsByReference(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Could not generate a unique payment reference after several attempts");
    }

    private String randomSuffix() {
        StringBuilder sb = new StringBuilder(SUFFIX_LENGTH);
        for (int i = 0; i < SUFFIX_LENGTH; i++) {
            sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }
}
