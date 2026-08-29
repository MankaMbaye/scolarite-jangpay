package com.scolarite.backend.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        /** Left blank when a SUPER_ADMIN is logging in. */
        String tenantCode,
        @NotBlank @Email String email,
        @NotBlank String password
) {
}
