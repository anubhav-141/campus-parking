package parking.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "parking_zones")
public class ParkingZone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String location;

    /**
     * Short prefix used when auto-generating slot numbers, e.g. "A", "B", "ENG".
     * Auto-derived from the zone name if left blank at create time.
     */
    @Column(length = 8)
    private String zoneCode;

    @Column(nullable = false)
    private int totalSlots;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ZoneStatus status = ZoneStatus.ACTIVE;

    @OneToMany(mappedBy = "zone", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<ParkingSlot> slots = new ArrayList<>();

    public enum ZoneStatus {
        ACTIVE, INACTIVE
    }

    public ParkingZone() {}

    public ParkingZone(String name, String location, int totalSlots) {
        this.name = name;
        this.location = location;
        this.totalSlots = totalSlots;
        this.status = ZoneStatus.ACTIVE;
    }

    public ParkingZone(String name, String location, String zoneCode, int totalSlots) {
        this.name = name;
        this.location = location;
        this.zoneCode = zoneCode;
        this.totalSlots = totalSlots;
        this.status = ZoneStatus.ACTIVE;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getZoneCode() { return zoneCode; }
    public void setZoneCode(String zoneCode) { this.zoneCode = zoneCode; }

    public int getTotalSlots() { return totalSlots; }
    public void setTotalSlots(int totalSlots) { this.totalSlots = totalSlots; }

    public ZoneStatus getStatus() { return status; }
    public void setStatus(ZoneStatus status) { this.status = status; }

    public List<ParkingSlot> getSlots() { return slots; }
    public void setSlots(List<ParkingSlot> slots) { this.slots = slots; }
}

