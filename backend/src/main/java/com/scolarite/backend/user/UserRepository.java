package com.scolarite.backend.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailAndTenantId(String email, UUID tenantId);
    Optional<User> findByEmailAndTenantIdIsNull(String email);
    boolean existsByEmailAndTenantId(String email, UUID tenantId);
}
