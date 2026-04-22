package parking.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "parking_slots")
public class ParkingSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "zone_id", nullable = false)
    @JsonIgnoreProperties({"slots"})
    private ParkingZone zone;

    @Column(nullable = false)
    private String slotNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SlotStatus status = SlotStatus.AVAILABLE;

    public enum SlotStatus {
        AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE
    }

    public ParkingSlot() {}

    public ParkingSlot(ParkingZone zone, String slotNumber) {
        this.zone = zone;
        this.slotNumber = slotNumber;
        this.status = SlotStatus.AVAILABLE;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public ParkingZone getZone() { return zone; }
    public void setZone(ParkingZone zone) { this.zone = zone; }

    public String getSlotNumber() { return slotNumber; }
    public void setSlotNumber(String slotNumber) { this.slotNumber = slotNumber; }

    public SlotStatus getStatus() { return status; }
    public void setStatus(SlotStatus status) { this.status = status; }
}
