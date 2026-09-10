package com.scolarite.backend.user;

public enum Role {
    /** Manages the whole SaaS platform, not tied to a tenant. */
    SUPER_ADMIN,
    /** Manages a single establishment (tenant). */
    TENANT_ADMIN,
    /** Handles day-to-day payment operations: cash confirmation, refunds. */
    ACCOUNTANT,
    TEACHER,
    STUDENT,
    PARENT
}
