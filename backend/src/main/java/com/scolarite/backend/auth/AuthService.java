package com.scolarite.backend.auth;

import com.scolarite.backend.security.JwtService;
import com.scolarite.backend.tenant.Tenant;
import com.scolarite.backend.tenant.TenantRepository;
import com.scolarite.backend.user.Role;
import com.scolarite.backend.user.User;
import com.scolarite.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse registerTenant(RegisterTenantRequest request) {
        if (tenantRepository.existsByCode(request.tenantCode())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "tenantCode already in use");
        }

        Tenant tenant = new Tenant();
        tenant.setName(request.tenantName());
        tenant.setCode(request.tenantCode());
        tenant = tenantRepository.save(tenant);

        User admin = new User();
        admin.setTenantId(tenant.getId());
        admin.setEmail(request.adminEmail());
        admin.setPassword(passwordEncoder.encode(request.adminPassword()));
        admin.setFullName(request.adminFullName());
        admin.setRole(Role.TENANT_ADMIN);
        admin = userRepository.save(admin);

        return buildResponse(admin);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = resolveUser(request.tenantCode(), request.email());

        if (!user.isEnabled() || !passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        return buildResponse(user);
    }

    private User resolveUser(String tenantCode, String email) {
        if (tenantCode == null || tenantCode.isBlank()) {
            return userRepository.findByEmailAndTenantIdIsNull(email)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
        }

        Tenant tenant = tenantRepository.findByCode(tenantCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        return userRepository.findByEmailAndTenantId(email, tenant.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
    }

    private AuthResponse buildResponse(User user) {
        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getTenantId(), user.getRole().name());
        return new AuthResponse(token, user.getId(), user.getTenantId(), user.getRole().name(), user.getFullName(), user.getEmail());
    }
}
