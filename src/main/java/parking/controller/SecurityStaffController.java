package parking.controller;

import parking.dto.SlotStatusUpdate;
import parking.model.ParkingSlot;
import parking.service.ReservationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/security")
public class SecurityStaffController {

    private final ReservationService reservationService;

    public SecurityStaffController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @GetMapping("/reservations/active")
    public ResponseEntity<?> getActiveReservations() {
        return ResponseEntity.ok(reservationService.getActiveReservations());
    }

    @GetMapping("/verify/{qrCode}")
    public ResponseEntity<?> verifyQrCode(@PathVariable String qrCode) {
        try {
            var reservation = reservationService.verifyQrCode(qrCode);
            return ResponseEntity.ok(reservation);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "valid", false));
        }
    }

    /**
     * Checkout a reservation when the vehicle leaves the parking lot.
     * Marks the reservation COMPLETED and frees the slot.
     */
    @PostMapping("/reservations/{id}/checkout")
    public ResponseEntity<?> checkoutReservation(@PathVariable Long id, Authentication auth) {
        try {
            var reservation = reservationService.checkoutReservation(id, auth.getName());
            return ResponseEntity.ok(reservation);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/slots/{id}/status")
    public ResponseEntity<?> updateSlotStatus(@PathVariable Long id,
                                               @Valid @RequestBody SlotStatusUpdate update,
                                               Authentication auth) {
        try {
            ParkingSlot.SlotStatus status = ParkingSlot.SlotStatus.valueOf(update.getStatus().toUpperCase());
            reservationService.updateSlotStatus(id, status, auth.getName());
            return ResponseEntity.ok(Map.of("message", "Slot status updated successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid status: " + update.getStatus()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
