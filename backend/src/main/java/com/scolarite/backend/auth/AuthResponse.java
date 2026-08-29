package com.scolarite.backend.auth;

import java.util.UUID;

public record AuthResponse(
        String token,
        UUID userId,
        UUID tenantId,
        String role,
        String fullName,
        String email
) {
}
