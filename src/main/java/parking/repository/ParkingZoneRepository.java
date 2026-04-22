package parking.repository;

import parking.model.ParkingZone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ParkingZoneRepository extends JpaRepository<ParkingZone, Long> {
    List<ParkingZone> findByStatus(ParkingZone.ZoneStatus status);
}

