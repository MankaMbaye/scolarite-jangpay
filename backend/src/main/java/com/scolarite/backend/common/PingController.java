package com.scolarite.backend.common;

import com.scolarite.backend.security.JwtService;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Simple authenticated endpoint used by the frontend to verify the login flow end-to-end. */
@RestController
public class PingController {

    @GetMapping("/api/ping")
    public Map<String, Object> ping() {
        var principal = (JwtService.TokenPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return Map.of(
                "message", "pong",
                "email", principal.email(),
                "role", principal.role(),
                "tenantId", principal.tenantId()
        );
    }
}
