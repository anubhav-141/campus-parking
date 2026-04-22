package parking.service;

import parking.dto.DashboardStats;
import parking.model.ParkingSlot;
import parking.model.Reservation;
import parking.repository.ParkingSlotRepository;
import parking.repository.ParkingZoneRepository;
import parking.repository.ReservationRepository;
import parking.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class ReportService {

    private final ParkingSlotRepository slotRepository;
    private final ReservationRepository reservationRepository;
    private final UserRepository userRepository;
    private final ParkingZoneRepository zoneRepository;

    public ReportService(ParkingSlotRepository slotRepository,
                         ReservationRepository reservationRepository,
                         UserRepository userRepository,
                         ParkingZoneRepository zoneRepository) {
        this.slotRepository = slotRepository;
        this.reservationRepository = reservationRepository;
        this.userRepository = userRepository;
        this.zoneRepository = zoneRepository;
    }

    public DashboardStats getDashboardStats() {
        DashboardStats stats = new DashboardStats();

        long totalSlots = slotRepository.count();
        long available = slotRepository.countByStatus(ParkingSlot.SlotStatus.AVAILABLE);
        long occupied = slotRepository.countByStatus(ParkingSlot.SlotStatus.OCCUPIED);
        long reserved = slotRepository.countByStatus(ParkingSlot.SlotStatus.RESERVED);
        long maintenance = slotRepository.countByStatus(ParkingSlot.SlotStatus.MAINTENANCE);

        stats.setTotalSlots(totalSlots);
        stats.setAvailableSlots(available);
        stats.setOccupiedSlots(occupied);
        stats.setReservedSlots(reserved);
        stats.setMaintenanceSlots(maintenance);
        stats.setActiveReservations(reservationRepository.countByStatus(Reservation.ReservationStatus.ACTIVE));
        stats.setTotalReservations(reservationRepository.count());
        stats.setTotalUsers(userRepository.count());

        if (totalSlots > 0) {
            stats.setOccupancyRate(((double)(occupied + reserved) / totalSlots) * 100);
        }

        return stats;
    }

    public List<Map<String, Object>> generateReport(LocalDateTime startDate, LocalDateTime endDate) {
        List<Reservation> reservations = reservationRepository.findByDateRange(startDate, endDate);
        List<Map<String, Object>> report = new ArrayList<>();

        for (Reservation r : reservations) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id", r.getId());
            entry.put("user", r.getUser().getFullName());
            entry.put("username", r.getUser().getUsername());
            entry.put("vehiclePlate", r.getUser().getVehiclePlate());
            entry.put("zone", r.getSlot().getZone().getName());
            entry.put("slot", r.getSlot().getSlotNumber());
            entry.put("startTime", r.getStartTime().toString());
            entry.put("endTime", r.getEndTime().toString());
            entry.put("status", r.getStatus().name());
            entry.put("qrCode", r.getQrCode());
            report.add(entry);
        }

        return report;
    }

    public Map<String, Object> getUsageByZone() {
        Map<String, Object> usage = new LinkedHashMap<>();
        var zones = zoneRepository.findAll();

        List<String> zoneNames = new ArrayList<>();
        List<Long> totalSlots = new ArrayList<>();
        List<Long> occupiedSlots = new ArrayList<>();

        for (var zone : zones) {
            zoneNames.add(zone.getName());
            long total = slotRepository.findByZoneId(zone.getId()).size();
            long occupied = slotRepository.countByZoneIdAndStatus(zone.getId(), ParkingSlot.SlotStatus.OCCUPIED);
            long reserved = slotRepository.countByZoneIdAndStatus(zone.getId(), ParkingSlot.SlotStatus.RESERVED);
            totalSlots.add(total);
            occupiedSlots.add(occupied + reserved);
        }

        usage.put("zoneNames", zoneNames);
        usage.put("totalSlots", totalSlots);
        usage.put("occupiedSlots", occupiedSlots);

        return usage;
    }
}
