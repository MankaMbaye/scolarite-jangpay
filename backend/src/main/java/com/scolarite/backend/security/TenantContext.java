package com.scolarite.backend.security;

import java.util.UUID;

/**
 * Holds the current request's tenant id. Populated by {@link JwtAuthenticationFilter}
 * and cleared at the end of every request.
 */
public final class TenantContext {

    private static final ThreadLocal<UUID> CURRENT_TENANT = new ThreadLocal<>();

    private TenantContext() {
    }

    public static void setTenantId(UUID tenantId) {
        CURRENT_TENANT.set(tenantId);
    }

    public static UUID getTenantId() {
        return CURRENT_TENANT.get();
    }

    public static void clear() {
        CURRENT_TENANT.remove();
    }
}
