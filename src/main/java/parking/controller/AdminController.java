package parking.controller;

import parking.model.ParkingZone;
import parking.repository.UserRepository;
import parking.service.AuditLogService;
import parking.service.ParkingService;
import parking.service.ReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final ReportService reportService;
    private final ParkingService parkingService;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    public AdminController(ReportService reportService,
                           ParkingService parkingService,
                           UserRepository userRepository,
                           AuditLogService auditLogService) {
        this.reportService = reportService;
        this.parkingService = parkingService;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getDashboardStats() {
        return ResponseEntity.ok(reportService.getDashboardStats());
    }

    @GetMapping("/usage")
    public ResponseEntity<?> getUsageByZone() {
        return ResponseEntity.ok(reportService.getUsageByZone());
    }

    @PostMapping("/zones")
    public ResponseEntity<?> createZone(@RequestBody ParkingZone zone, Authentication auth) {
        try {
            var saved = parkingService.createZone(zone);
            auditLogService.log(auth.getName(), "ZONE_CREATE",
                    "#" + saved.getId() + " " + saved.getName() + " (code=" + saved.getZoneCode() + ")");
            return ResponseEntity.ok(saved);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/zones/{id}")
    public ResponseEntity<?> updateZone(@PathVariable Long id,
                                        @RequestBody ParkingZone zone,
                                        Authentication auth) {
        try {
            var saved = parkingService.updateZone(id, zone);
            auditLogService.log(auth.getName(), "ZONE_UPDATE", "#" + id + " " + saved.getName());
            return ResponseEntity.ok(saved);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/zones/{id}")
    public ResponseEntity<?> deleteZone(@PathVariable Long id, Authentication auth) {
        try {
            parkingService.deleteZone(id);
            auditLogService.log(auth.getName(), "ZONE_DELETE", "#" + id);
            return ResponseEntity.ok(Map.of("message", "Zone deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/zones/{zoneId}/slots")
    public ResponseEntity<?> createSlots(@PathVariable Long zoneId,
                                         @RequestBody Map<String, Integer> body,
                                         Authentication auth) {
        try {
            int count = body.getOrDefault("count", 10);
            parkingService.createSlotsForZone(zoneId, count);
            auditLogService.log(auth.getName(), "SLOTS_ADD", count + " slots to zone #" + zoneId);
            return ResponseEntity.ok(Map.of("message", count + " slots created successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/reports")
    public ResponseEntity<?> generateReport(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        LocalDateTime start = (startDate != null && !startDate.isBlank())
                ? LocalDateTime.parse(startDate) : LocalDateTime.now().minusDays(30);
        LocalDateTime end = (endDate != null && !endDate.isBlank())
                ? LocalDateTime.parse(endDate) : LocalDateTime.now();
        return ResponseEntity.ok(reportService.generateReport(start, end));
    }

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        var users = userRepository.findAll();
        return ResponseEntity.ok(users.stream().map(u -> Map.of(
                "id", u.getId(),
                "username", u.getUsername(),
                "email", u.getEmail(),
                "fullName", u.getFullName() != null ? u.getFullName() : "",
                "role", u.getRole().name(),
                "vehiclePlate", u.getVehiclePlate() != null ? u.getVehiclePlate() : "",
                "createdAt", u.getCreatedAt() != null ? u.getCreatedAt().toString() : ""
        )).toList());
    }

    @GetMapping("/audit")
    public ResponseEntity<?> getAuditLog(@RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "50") int size) {
        var result = auditLogService.recent(page, size);
        return ResponseEntity.ok(Map.of(
                "content", result.getContent(),
                "totalElements", result.getTotalElements(),
                "totalPages", result.getTotalPages(),
                "page", page,
                "size", size
        ));
    }
}
