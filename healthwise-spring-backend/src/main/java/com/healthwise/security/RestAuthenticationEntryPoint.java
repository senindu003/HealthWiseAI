package com.healthwise.security;
import jakarta.servlet.http.HttpServletRequest; import jakarta.servlet.http.HttpServletResponse; import java.io.IOException; import org.springframework.http.MediaType; import org.springframework.security.core.AuthenticationException; import org.springframework.security.web.AuthenticationEntryPoint; import org.springframework.stereotype.Component;
/** Returns JSON instead of a redirect for unauthenticated requests. */
@Component public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint { public void commence(HttpServletRequest r,HttpServletResponse s,AuthenticationException e)throws IOException{s.setStatus(401);s.setContentType(MediaType.APPLICATION_JSON_VALUE);s.getWriter().write("{\"message\":\"Authentication is required\"}");} }
