package parking.service;

import parking.dto.ReservationRequest;
import parking.model.ParkingSlot;
import parking.model.Reservation;
import parking.model.User;
import parking.repository.ParkingSlotRepository;
import parking.repository.ReservationRepository;
import parking.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final ParkingSlotRepository slotRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    public ReservationService(ReservationRepository reservationRepository,
                              ParkingSlotRepository slotRepository,
                              UserRepository userRepository,
                              NotificationService notificationService,
                              AuditLogService auditLogService) {
        this.reservationRepository = reservationRepository;
        this.slotRepository = slotRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public Reservation createReservation(String username, ReservationRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ParkingSlot slot = slotRepository.findById(request.getSlotId())
                .orElseThrow(() -> new RuntimeException("Slot not found"));

        LocalDateTime start = request.getStartTime();
        LocalDateTime end = request.getEndTime();

        if (end.isBefore(start) || end.isEqual(start)) {
            throw new RuntimeException("End time must be after start time");
        }

        if (end.isBefore(LocalDateTime.now())) {
            throw new RuntimeException("End time cannot be in the past");
        }

        if (slot.getStatus() == ParkingSlot.SlotStatus.MAINTENANCE) {
            throw new RuntimeException("Slot is under maintenance");
        }

        // Overlap check against any ACTIVE reservation on this slot, regardless of
        // whether its start is in the past or the future.
        List<Reservation> overlapping = reservationRepository.findOverlapping(slot.getId(), start, end);
        if (!overlapping.isEmpty()) {
            Reservation conflict = overlapping.get(0);
            throw new RuntimeException("Slot already reserved from "
                    + conflict.getStartTime() + " to " + conflict.getEndTime());
        }

        String qrCode = UUID.randomUUID().toString();

        Reservation reservation = new Reservation(user, slot, start, end, qrCode);
        reservationRepository.save(reservation);

        // Mark the slot RESERVED only if the booking is current; future bookings
        // keep the slot AVAILABLE (so others can book non-overlapping windows).
        LocalDateTime now = LocalDateTime.now();
        if (!start.isAfter(now) && slot.getStatus() == ParkingSlot.SlotStatus.AVAILABLE) {
            slot.setStatus(ParkingSlot.SlotStatus.RESERVED);
            slotRepository.save(slot);
        }

        notificationService.createNotification(user,
                "Reservation confirmed for slot " + slot.getSlotNumber() +
                " in " + slot.getZone().getName() +
                ". Valid until " + end.toString().replace("T", " "));

        auditLogService.log(username, "RESERVATION_CREATE",
                "Slot " + slot.getSlotNumber() + " (" + start + " - " + end + ")");

        return reservation;
    }

    public List<Reservation> getUserReservations(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return reservationRepository.findByUserOrderByStartTimeDesc(user);
    }

    @Transactional
    public void cancelReservation(Long reservationId, String username) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Reservation not found"));

        if (!reservation.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Not authorized to cancel this reservation");
        }

        if (reservation.getStatus() != Reservation.ReservationStatus.ACTIVE) {
            throw new RuntimeException("Cannot cancel a non-active reservation");
        }

        reservation.setStatus(Reservation.ReservationStatus.CANCELLED);
        reservationRepository.save(reservation);

        ParkingSlot slot = reservation.getSlot();
        if (slot.getStatus() == ParkingSlot.SlotStatus.RESERVED) {
            slot.setStatus(ParkingSlot.SlotStatus.AVAILABLE);
            slotRepository.save(slot);
        }

        notificationService.createNotification(reservation.getUser(),
                "Reservation for slot " + slot.getSlotNumber() + " has been cancelled.");

        auditLogService.log(username, "RESERVATION_CANCEL", "Reservation #" + reservationId);
    }

    @Transactional
    public void deleteReservation(Long reservationId, String username) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Reservation not found"));

        if (!reservation.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Not authorized to delete this reservation");
        }

        if (reservation.getStatus() == Reservation.ReservationStatus.ACTIVE) {
            reservation.setStatus(Reservation.ReservationStatus.CANCELLED);
            ParkingSlot slot = reservation.getSlot();
            if (slot.getStatus() == ParkingSlot.SlotStatus.RESERVED) {
                slot.setStatus(ParkingSlot.SlotStatus.AVAILABLE);
                slotRepository.save(slot);
            }
        }

        reservationRepository.delete(reservation);
        auditLogService.log(username, "RESERVATION_DELETE", "Reservation #" + reservationId);
    }

    public List<Reservation> getActiveReservations() {
        return reservationRepository.findByStatus(Reservation.ReservationStatus.ACTIVE);
    }

    public Reservation verifyQrCode(String qrCode) {
        return reservationRepository.findByQrCode(qrCode)
                .orElseThrow(() -> new RuntimeException("Invalid QR code"));
    }

    /**
     * Security-staff checkout: marks the reservation COMPLETED, frees the slot,
     * and notifies the driver. This is the proper terminal state used when the
     * vehicle leaves the parking lot (as opposed to passive expiry).
     */
    @Transactional
    public Reservation checkoutReservation(Long reservationId, String staffUsername) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Reservation not found"));

        if (reservation.getStatus() != Reservation.ReservationStatus.ACTIVE) {
            throw new RuntimeException("Only active reservations can be checked out");
        }

        reservation.setStatus(Reservation.ReservationStatus.COMPLETED);
        reservationRepository.save(reservation);

        ParkingSlot slot = reservation.getSlot();
        slot.setStatus(ParkingSlot.SlotStatus.AVAILABLE);
        slotRepository.save(slot);

        notificationService.createNotification(reservation.getUser(),
                "Checkout complete for slot " + slot.getSlotNumber() +
                ". Thanks for using CampusParking!");

        auditLogService.log(staffUsername, "RESERVATION_CHECKOUT",
                "Reservation #" + reservationId + ", slot " + slot.getSlotNumber());

        return reservation;
    }

    @Transactional
    public void updateSlotStatus(Long slotId, ParkingSlot.SlotStatus status, String actor) {
        ParkingSlot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new RuntimeException("Slot not found"));
        ParkingSlot.SlotStatus previous = slot.getStatus();
        slot.setStatus(status);
        slotRepository.save(slot);

        auditLogService.log(actor, "SLOT_STATUS_UPDATE",
                "Slot " + slot.getSlotNumber() + ": " + previous + " -> " + status);
    }

    @Transactional
    public void expireReservations() {
        LocalDateTime now = LocalDateTime.now();
        List<Reservation> activeReservations = reservationRepository.findByStatus(Reservation.ReservationStatus.ACTIVE);

        for (Reservation reservation : activeReservations) {
            if (reservation.getEndTime().isBefore(now)) {
                reservation.setStatus(Reservation.ReservationStatus.EXPIRED);
                reservationRepository.save(reservation);

                ParkingSlot slot = reservation.getSlot();
                if (slot.getStatus() == ParkingSlot.SlotStatus.RESERVED ||
                        slot.getStatus() == ParkingSlot.SlotStatus.OCCUPIED) {
                    slot.setStatus(ParkingSlot.SlotStatus.AVAILABLE);
                    slotRepository.save(slot);
                }

                notificationService.createNotification(reservation.getUser(),
                        "Your reservation for slot " + slot.getSlotNumber() +
                        " has expired. The slot is now available.");
            } else if (!reservation.getStartTime().isAfter(now)
                    && reservation.getSlot().getStatus() == ParkingSlot.SlotStatus.AVAILABLE) {
                // Activate future reservation whose start time has just arrived
                ParkingSlot slot = reservation.getSlot();
                slot.setStatus(ParkingSlot.SlotStatus.RESERVED);
                slotRepository.save(slot);
            }
        }
    }
}
