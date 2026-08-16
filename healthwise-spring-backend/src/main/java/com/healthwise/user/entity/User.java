package com.healthwise.user.entity;

import com.healthwise.common.entity.AuditedDocument;
import java.util.Set;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/** User account persisted in the users collection. */
@Document("users")
public class User extends AuditedDocument {
  @Id private String id;
  @Indexed(unique=true) private String email;
  private String password;
  private String firstName;
  private String lastName;
  private boolean enabled=true;
  private Set<Role> roles=Set.of(Role.USER);
  public String getId(){return id;} public String getEmail(){return email;} public String getPassword(){return password;} public String getFirstName(){return firstName;} public String getLastName(){return lastName;} public boolean isEnabled(){return enabled;} public Set<Role> getRoles(){return roles;}
  public void setEmail(String v){email=v;} public void setPassword(String v){password=v;} public void setFirstName(String v){firstName=v;} public void setLastName(String v){lastName=v;} public void setEnabled(boolean v){enabled=v;} public void setRoles(Set<Role> v){roles=Set.copyOf(v);}
}
