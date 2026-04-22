package parking.controller;

import parking.service.ParkingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/parking")
public class ParkingController {

    private final ParkingService parkingService;

    public ParkingController(ParkingService parkingService) {
        this.parkingService = parkingService;
    }

    @GetMapping("/zones")
    public ResponseEntity<?> getAllZones() {
        return ResponseEntity.ok(parkingService.getAllZonesWithAvailability());
    }

    /**
     * Single-call payload containing every active zone together with its slots.
     * Used by the security dashboard to avoid issuing one request per zone.
     */
    @GetMapping("/zones-with-slots")
    public ResponseEntity<?> getAllZonesWithSlots() {
        return ResponseEntity.ok(parkingService.getAllZonesWithSlots());
    }

    @GetMapping("/zones/{id}/slots")
    public ResponseEntity<?> getSlotsByZone(@PathVariable Long id) {
        return ResponseEntity.ok(parkingService.getSlotsByZone(id));
    }
}
