package parking.repository;

import parking.model.ParkingSlot;
import parking.model.ParkingZone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ParkingSlotRepository extends JpaRepository<ParkingSlot, Long> {
    List<ParkingSlot> findByZone(ParkingZone zone);
    List<ParkingSlot> findByZoneId(Long zoneId);
    List<ParkingSlot> findByZoneIdOrderBySlotNumberAsc(Long zoneId);
    List<ParkingSlot> findByZoneAndStatus(ParkingZone zone, ParkingSlot.SlotStatus status);
    List<ParkingSlot> findByZoneIdAndStatus(Long zoneId, ParkingSlot.SlotStatus status);
    long countByZoneAndStatus(ParkingZone zone, ParkingSlot.SlotStatus status);
    long countByZoneIdAndStatus(Long zoneId, ParkingSlot.SlotStatus status);
    long countByStatus(ParkingSlot.SlotStatus status);
}
