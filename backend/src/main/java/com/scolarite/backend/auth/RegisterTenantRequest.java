package com.scolarite.backend.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterTenantRequest(
        @NotBlank String tenantName,
        @NotBlank @Pattern(regexp = "^[a-z0-9-]{3,50}$", message = "code must be lowercase letters, digits and hyphens") String tenantCode,
        @NotBlank String adminFullName,
        @NotBlank @Email String adminEmail,
        @NotBlank @Size(min = 8) String adminPassword
) {
}
