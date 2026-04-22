package parking.config;

import parking.model.Notification;
import parking.model.ParkingSlot;
import parking.model.ParkingZone;
import parking.model.Reservation;
import parking.model.User;
import parking.repository.NotificationRepository;
import parking.repository.ParkingSlotRepository;
import parking.repository.ParkingZoneRepository;
import parking.repository.ReservationRepository;
import parking.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ParkingZoneRepository zoneRepository;
    private final ParkingSlotRepository slotRepository;
    private final ReservationRepository reservationRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository,
                      ParkingZoneRepository zoneRepository,
                      ParkingSlotRepository slotRepository,
                      ReservationRepository reservationRepository,
                      NotificationRepository notificationRepository,
                      PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.zoneRepository = zoneRepository;
        this.slotRepository = slotRepository;
        this.reservationRepository = reservationRepository;
        this.notificationRepository = notificationRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) return; // Already seeded

        System.out.println("🌱 Seeding demo data...");

        // Create users
        User user1 = new User("user1", "user1@campus.edu", passwordEncoder.encode("password123"),
                User.Role.ROLE_USER, "John Student", "KA-01-AB-1234");
        User user2 = new User("user2", "user2@campus.edu", passwordEncoder.encode("password123"),
                User.Role.ROLE_USER, "Jane Scholar", "KA-01-CD-5678");
        User security1 = new User("security1", "security@campus.edu", passwordEncoder.encode("password123"),
                User.Role.ROLE_SECURITY, "Mike Guard", null);
        User admin1 = new User("admin1", "admin@campus.edu", passwordEncoder.encode("password123"),
                User.Role.ROLE_ADMIN, "Sarah Admin", null);

        userRepository.save(user1);
        userRepository.save(user2);
        userRepository.save(security1);
        userRepository.save(admin1);

        // Create parking zones (zoneCode is the slot-number prefix)
        ParkingZone zoneA = new ParkingZone("Zone A - Main Building", "Near Main Entrance Gate", "A", 10);
        ParkingZone zoneB = new ParkingZone("Zone B - Library", "Behind Central Library", "B", 10);
        ParkingZone zoneC = new ParkingZone("Zone C - Sports Complex", "Adjacent to Sports Ground", "C", 10);

        zoneRepository.save(zoneA);
        zoneRepository.save(zoneB);
        zoneRepository.save(zoneC);

        ParkingZone[] zones = {zoneA, zoneB, zoneC};
        for (ParkingZone zone : zones) {
            for (int i = 1; i <= 10; i++) {
                ParkingSlot slot = new ParkingSlot(zone, zone.getZoneCode() + i);
                slotRepository.save(slot);
            }
        }

        // Seeded reservation: valid for next 4 hours (won't expire prematurely)
        ParkingSlot slotA1 = slotRepository.findByZoneIdAndStatus(zoneA.getId(), ParkingSlot.SlotStatus.AVAILABLE).get(0);
        slotA1.setStatus(ParkingSlot.SlotStatus.RESERVED);
        slotRepository.save(slotA1);

        Reservation res1 = new Reservation(user1, slotA1,
                LocalDateTime.now(),
                LocalDateTime.now().plusHours(4),
                UUID.randomUUID().toString());
        reservationRepository.save(res1);

        // Another seeded reservation for user2 (occupied slot)
        ParkingSlot slotA2 = slotRepository.findByZoneIdAndStatus(zoneA.getId(), ParkingSlot.SlotStatus.AVAILABLE).get(0);
        slotA2.setStatus(ParkingSlot.SlotStatus.OCCUPIED);
        slotRepository.save(slotA2);

        Reservation res2 = new Reservation(user2, slotA2,
                LocalDateTime.now().minusHours(1),
                LocalDateTime.now().plusHours(3),
                UUID.randomUUID().toString());
        reservationRepository.save(res2);

        // Set a slot as maintenance for demo
        ParkingSlot slotC5 = slotRepository.findByZoneIdAndStatus(zoneC.getId(), ParkingSlot.SlotStatus.AVAILABLE).get(4);
        slotC5.setStatus(ParkingSlot.SlotStatus.MAINTENANCE);
        slotRepository.save(slotC5);

        // Create sample notifications
        notificationRepository.save(new Notification(user1,
                "Welcome to Campus Parking! Your account has been created successfully."));
        notificationRepository.save(new Notification(user1,
                "Reservation confirmed for slot " + slotA1.getSlotNumber() + " in " + zoneA.getName()));

        System.out.println("✅ Demo data seeded successfully!");
        System.out.println("   Users: user1/password123, security1/password123, admin1/password123");
    }
}
