package com.healthwise.assessment.auth.security;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Reads the authenticated user id populated by {@link JwtAuthenticationFilter}. Kept as a
 * standalone component (rather than inlined in one controller) since any future controller
 * needing "who is making this request" can reuse it.
 */
@Component
public class CurrentUserProvider {

    public String currentUserId() {
        return (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
