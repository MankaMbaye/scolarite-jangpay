package com.scolarite.backend.user;

public enum Role {
    /** Manages the whole SaaS platform, not tied to a tenant. */
    SUPER_ADMIN,
    /** Manages a single establishment (tenant). */
    TENANT_ADMIN,
    TEACHER,
    STUDENT,
    PARENT
}
