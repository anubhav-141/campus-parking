package parking.controller;

import parking.dto.ReservationRequest;
import parking.service.ReservationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/reservations")
public class ReservationController {

    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @PostMapping
    public ResponseEntity<?> createReservation(@Valid @RequestBody ReservationRequest request,
                                                Authentication authentication) {
        try {
            var reservation = reservationService.createReservation(authentication.getName(), request);
            return ResponseEntity.ok(reservation);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/my")
    public ResponseEntity<?> getMyReservations(Authentication authentication) {
        return ResponseEntity.ok(reservationService.getUserReservations(authentication.getName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancelReservation(@PathVariable Long id, Authentication authentication) {
        try {
            reservationService.cancelReservation(id, authentication.getName());
            return ResponseEntity.ok(Map.of("message", "Reservation cancelled successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}/delete")
    public ResponseEntity<?> deleteReservation(@PathVariable Long id, Authentication authentication) {
        try {
            reservationService.deleteReservation(id, authentication.getName());
            return ResponseEntity.ok(Map.of("message", "Reservation deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
