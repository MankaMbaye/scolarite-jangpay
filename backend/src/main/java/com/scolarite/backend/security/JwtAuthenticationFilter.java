package com.scolarite.backend.security;

import jakarta.persistence.EntityManager;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.hibernate.Session;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Validates the JWT bearer token, populates the Spring Security context and
 * the current-request {@link TenantContext}, and enables the Hibernate
 * "tenantFilter" so that queries on {@code TenantAwareEntity} subclasses are
 * automatically scoped to the caller's tenant.
 *
 * <p>Deliberately NOT a {@code @Component}: Spring Boot auto-registers every
 * {@code Filter} bean with the servlet container, which both duplicates this
 * filter outside the Spring Security chain and forces it to be created too
 * early for the JPA {@link EntityManager} to be available. It is instead
 * built manually by {@link SecurityConfig} once all its dependencies exist.
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final EntityManager entityManager;

    public JwtAuthenticationFilter(JwtService jwtService, EntityManager entityManager) {
        this.jwtService = jwtService;
        this.entityManager = entityManager;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {
        try {
            String header = request.getHeader("Authorization");
            if (header != null && header.startsWith("Bearer ")) {
                var claims = jwtService.parseClaims(header.substring(7));
                var principal = jwtService.toPrincipal(claims);

                var authentication = new UsernamePasswordAuthenticationToken(
                        principal,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + principal.role())));
                SecurityContextHolder.getContext().setAuthentication(authentication);

                if (principal.tenantId() != null) {
                    TenantContext.setTenantId(principal.tenantId());
                    entityManager.unwrap(Session.class)
                            .enableFilter("tenantFilter")
                            .setParameter("tenantId", principal.tenantId());
                }
            }
            filterChain.doFilter(request, response);
        } catch (Exception ex) {
            SecurityContextHolder.clearContext();
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Invalid or expired token\"}");
        } finally {
            TenantContext.clear();
        }
    }
}
