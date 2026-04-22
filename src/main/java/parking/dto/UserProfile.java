package parking.dto;

import parking.model.User;

/**
 * Public view of a user - never contains the password hash, unlike the raw
 * User entity.
 */
public class UserProfile {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String vehiclePlate;
    private String role;
    private String createdAt;

    public UserProfile() {}

    public static UserProfile from(User u) {
        UserProfile p = new UserProfile();
        p.id = u.getId();
        p.username = u.getUsername();
        p.email = u.getEmail();
        p.fullName = u.getFullName();
        p.vehiclePlate = u.getVehiclePlate();
        p.role = u.getRole() != null ? u.getRole().name() : null;
        p.createdAt = u.getCreatedAt() != null ? u.getCreatedAt().toString() : null;
        return p;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getVehiclePlate() { return vehiclePlate; }
    public void setVehiclePlate(String vehiclePlate) { this.vehiclePlate = vehiclePlate; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
