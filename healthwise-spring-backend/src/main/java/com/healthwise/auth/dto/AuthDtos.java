package com.healthwise.auth.dto;
import jakarta.validation.constraints.Email; import jakarta.validation.constraints.NotBlank; import jakarta.validation.constraints.Size;
/** Authentication request and response contracts. */
public final class AuthDtos { private AuthDtos(){} public record Register(@Email @NotBlank String email,@NotBlank @Size(min=8,max=128) String password,@NotBlank @Size(max=80) String firstName,@NotBlank @Size(max=80) String lastName){} public record Login(@Email @NotBlank String email,@NotBlank String password){} public record Refresh(@NotBlank String refreshToken){} public record Tokens(String accessToken,String refreshToken,String tokenType){} }
