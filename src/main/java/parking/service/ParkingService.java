package parking.service;

import parking.model.ParkingSlot;
import parking.model.ParkingZone;
import parking.repository.ParkingSlotRepository;
import parking.repository.ParkingZoneRepository;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class ParkingService {

    private final ParkingZoneRepository zoneRepository;
    private final ParkingSlotRepository slotRepository;

    public ParkingService(ParkingZoneRepository zoneRepository, ParkingSlotRepository slotRepository) {
        this.zoneRepository = zoneRepository;
        this.slotRepository = slotRepository;
    }

    public List<Map<String, Object>> getAllZonesWithAvailability() {
        List<ParkingZone> zones = zoneRepository.findByStatus(ParkingZone.ZoneStatus.ACTIVE);
        List<Map<String, Object>> result = new ArrayList<>();

        for (ParkingZone zone : zones) {
            Map<String, Object> zoneMap = new LinkedHashMap<>();
            zoneMap.put("id", zone.getId());
            zoneMap.put("name", zone.getName());
            zoneMap.put("location", zone.getLocation());
            zoneMap.put("zoneCode", zone.getZoneCode());
            zoneMap.put("totalSlots", zone.getTotalSlots());
            zoneMap.put("status", zone.getStatus());

            long available = slotRepository.countByZoneAndStatus(zone, ParkingSlot.SlotStatus.AVAILABLE);
            long occupied = slotRepository.countByZoneAndStatus(zone, ParkingSlot.SlotStatus.OCCUPIED);
            long reserved = slotRepository.countByZoneAndStatus(zone, ParkingSlot.SlotStatus.RESERVED);
            long maintenance = slotRepository.countByZoneAndStatus(zone, ParkingSlot.SlotStatus.MAINTENANCE);

            zoneMap.put("availableSlots", available);
            zoneMap.put("occupiedSlots", occupied);
            zoneMap.put("reservedSlots", reserved);
            zoneMap.put("maintenanceSlots", maintenance);

            result.add(zoneMap);
        }

        return result;
    }

    /**
     * Single-call fetch of every active zone together with its slots, so the
     * security dashboard no longer has to issue one HTTP request per zone.
     */
    public List<Map<String, Object>> getAllZonesWithSlots() {
        List<ParkingZone> zones = zoneRepository.findByStatus(ParkingZone.ZoneStatus.ACTIVE);
        List<Map<String, Object>> result = new ArrayList<>();

        for (ParkingZone zone : zones) {
            Map<String, Object> zoneMap = new LinkedHashMap<>();
            zoneMap.put("id", zone.getId());
            zoneMap.put("name", zone.getName());
            zoneMap.put("location", zone.getLocation());
            zoneMap.put("zoneCode", zone.getZoneCode());
            zoneMap.put("totalSlots", zone.getTotalSlots());
            zoneMap.put("status", zone.getStatus());

            List<ParkingSlot> slots = slotRepository.findByZoneIdOrderBySlotNumberAsc(zone.getId());
            zoneMap.put("slots", slots);
            zoneMap.put("availableSlots",
                    slots.stream().filter(s -> s.getStatus() == ParkingSlot.SlotStatus.AVAILABLE).count());

            result.add(zoneMap);
        }

        return result;
    }

    public List<ParkingSlot> getSlotsByZone(Long zoneId) {
        return slotRepository.findByZoneIdOrderBySlotNumberAsc(zoneId);
    }

    public ParkingZone createZone(ParkingZone zone) {
        if (zone.getZoneCode() == null || zone.getZoneCode().isBlank()) {
            zone.setZoneCode(deriveZoneCode(zone.getName()));
        } else {
            zone.setZoneCode(zone.getZoneCode().trim().toUpperCase());
        }
        return zoneRepository.save(zone);
    }

    public ParkingZone updateZone(Long id, ParkingZone updated) {
        ParkingZone zone = zoneRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Zone not found"));
        zone.setName(updated.getName());
        zone.setLocation(updated.getLocation());
        zone.setTotalSlots(updated.getTotalSlots());
        if (updated.getZoneCode() != null && !updated.getZoneCode().isBlank()) {
            zone.setZoneCode(updated.getZoneCode().trim().toUpperCase());
        }
        if (updated.getStatus() != null) {
            zone.setStatus(updated.getStatus());
        }
        return zoneRepository.save(zone);
    }

    public void deleteZone(Long id) {
        zoneRepository.deleteById(id);
    }

    public void createSlotsForZone(Long zoneId, int count) {
        ParkingZone zone = zoneRepository.findById(zoneId)
                .orElseThrow(() -> new RuntimeException("Zone not found"));

        String prefix = zone.getZoneCode();
        if (prefix == null || prefix.isBlank()) {
            prefix = deriveZoneCode(zone.getName());
            zone.setZoneCode(prefix);
        }

        List<ParkingSlot> existingSlots = slotRepository.findByZoneId(zoneId);
        int startNumber = existingSlots.size() + 1;

        for (int i = 0; i < count; i++) {
            ParkingSlot slot = new ParkingSlot(zone, prefix + (startNumber + i));
            slotRepository.save(slot);
        }

        zone.setTotalSlots(existingSlots.size() + count);
        zoneRepository.save(zone);
    }

    /**
     * Derive a short, upper-case prefix (1-3 chars) from a zone name.
     * Examples:
     *   "Zone A - Main Building"        -> "A"
     *   "Engineering Block"             -> "EB"
     *   "Library"                       -> "LIB"
     */
    public static String deriveZoneCode(String name) {
        if (name == null || name.isBlank()) return "Z";
        String cleaned = name.trim();

        // Case 1: "Zone X ..." -> X
        String[] parts = cleaned.split("\\s+");
        if (parts.length >= 2 && parts[0].equalsIgnoreCase("zone") && parts[1].length() <= 3) {
            return parts[1].toUpperCase().replaceAll("[^A-Z0-9]", "");
        }

        // Case 2: multi-word name -> initials of first 2-3 words
        if (parts.length >= 2) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < Math.min(parts.length, 3); i++) {
                if (!parts[i].isEmpty()) sb.append(Character.toUpperCase(parts[i].charAt(0)));
            }
            String code = sb.toString().replaceAll("[^A-Z0-9]", "");
            if (!code.isEmpty()) return code;
        }

        // Case 3: single word -> first 3 chars
        String single = cleaned.replaceAll("[^A-Za-z0-9]", "");
        if (single.isEmpty()) return "Z";
        return single.substring(0, Math.min(3, single.length())).toUpperCase();
    }
}
