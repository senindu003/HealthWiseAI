package com.healthwise.user.dto;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
/** User API DTOs. */
public final class UserDtos { private UserDtos(){}
 public record Response(String id,String email,String firstName,String lastName,boolean enabled,Instant createdAt,Instant updatedAt){}
 public record Update(@NotBlank @Size(max=80) String firstName,@NotBlank @Size(max=80) String lastName){}
 public record PasswordUpdate(@NotBlank String currentPassword,@NotBlank @Size(min=12,max=128) String newPassword){}
}
