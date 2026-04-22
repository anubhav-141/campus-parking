package parking.service;

import parking.dto.ReservationRequest;
import parking.model.ParkingSlot;
import parking.model.ParkingZone;
import parking.model.Reservation;
import parking.model.User;
import parking.repository.ParkingSlotRepository;
import parking.repository.ReservationRepository;
import parking.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class ReservationServiceTest {

    private ReservationRepository reservationRepository;
    private ParkingSlotRepository slotRepository;
    private UserRepository userRepository;
    private NotificationService notificationService;
    private AuditLogService auditLogService;
    private ReservationService service;

    private User user;
    private ParkingZone zone;
    private ParkingSlot slot;

    @BeforeEach
    void setUp() {
        reservationRepository = mock(ReservationRepository.class);
        slotRepository = mock(ParkingSlotRepository.class);
        userRepository = mock(UserRepository.class);
        notificationService = mock(NotificationService.class);
        auditLogService = mock(AuditLogService.class);

        service = new ReservationService(reservationRepository, slotRepository, userRepository,
                notificationService, auditLogService);

        user = new User("u1", "u1@x.com", "hash", User.Role.ROLE_USER, "User One", "KA-01-AA-1111");
        user.setId(1L);

        zone = new ParkingZone("Zone A", "Main", "A", 10);
        zone.setId(1L);

        slot = new ParkingSlot(zone, "A1");
        slot.setId(10L);
        slot.setStatus(ParkingSlot.SlotStatus.AVAILABLE);
    }

    private ReservationRequest req(LocalDateTime start, LocalDateTime end) {
        ReservationRequest r = new ReservationRequest();
        r.setSlotId(slot.getId());
        r.setStartTime(start);
        r.setEndTime(end);
        return r;
    }

    @Test
    void createReservation_happyPath_reservesAvailableSlotAndNotifies() {
        when(userRepository.findByUsername("u1")).thenReturn(Optional.of(user));
        when(slotRepository.findById(slot.getId())).thenReturn(Optional.of(slot));
        when(reservationRepository.findOverlapping(anyLong(), any(), any())).thenReturn(Collections.emptyList());
        when(reservationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        LocalDateTime start = LocalDateTime.now();
        LocalDateTime end = start.plusHours(2);

        Reservation result = service.createReservation("u1", req(start, end));

        assertNotNull(result);
        assertEquals(Reservation.ReservationStatus.ACTIVE, result.getStatus());
        assertNotNull(result.getQrCode(), "QR code should be generated");
        assertEquals(ParkingSlot.SlotStatus.RESERVED, slot.getStatus(),
                "slot should be marked RESERVED when reservation starts now");
        verify(notificationService).createNotification(eq(user), contains("Reservation confirmed"));
        verify(auditLogService).log(eq("u1"), eq("RESERVATION_CREATE"), anyString());
    }

    @Test
    void createReservation_rejectsOverlappingWindow() {
        when(userRepository.findByUsername("u1")).thenReturn(Optional.of(user));
        when(slotRepository.findById(slot.getId())).thenReturn(Optional.of(slot));

        Reservation conflict = new Reservation(user, slot,
                LocalDateTime.now().plusHours(1),
                LocalDateTime.now().plusHours(3),
                "other-qr");
        when(reservationRepository.findOverlapping(anyLong(), any(), any()))
                .thenReturn(List.of(conflict));

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                service.createReservation("u1", req(LocalDateTime.now().plusHours(2), LocalDateTime.now().plusHours(4))));
        assertTrue(ex.getMessage().toLowerCase().contains("already reserved"));
        verify(reservationRepository, never()).save(any());
    }

    @Test
    void createReservation_rejectsEndBeforeStart() {
        when(userRepository.findByUsername("u1")).thenReturn(Optional.of(user));
        when(slotRepository.findById(slot.getId())).thenReturn(Optional.of(slot));

        LocalDateTime start = LocalDateTime.now().plusHours(2);
        LocalDateTime end = start.minusMinutes(30);

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                service.createReservation("u1", req(start, end)));
        assertTrue(ex.getMessage().contains("End time must be after start time"));
    }

    @Test
    void createReservation_rejectsMaintenanceSlot() {
        slot.setStatus(ParkingSlot.SlotStatus.MAINTENANCE);
        when(userRepository.findByUsername("u1")).thenReturn(Optional.of(user));
        when(slotRepository.findById(slot.getId())).thenReturn(Optional.of(slot));

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                service.createReservation("u1", req(LocalDateTime.now(), LocalDateTime.now().plusHours(1))));
        assertTrue(ex.getMessage().contains("maintenance"));
    }

    @Test
    void cancelReservation_onlyOwnerCanCancel() {
        Reservation r = new Reservation(user, slot, LocalDateTime.now(), LocalDateTime.now().plusHours(1), "qr");
        r.setId(5L);
        when(reservationRepository.findById(5L)).thenReturn(Optional.of(r));

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                service.cancelReservation(5L, "someoneElse"));
        assertTrue(ex.getMessage().contains("Not authorized"));
    }

    @Test
    void cancelReservation_freesReservedSlot() {
        slot.setStatus(ParkingSlot.SlotStatus.RESERVED);
        Reservation r = new Reservation(user, slot, LocalDateTime.now(), LocalDateTime.now().plusHours(1), "qr");
        r.setId(5L);
        when(reservationRepository.findById(5L)).thenReturn(Optional.of(r));
        when(reservationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.cancelReservation(5L, "u1");

        assertEquals(Reservation.ReservationStatus.CANCELLED, r.getStatus());
        assertEquals(ParkingSlot.SlotStatus.AVAILABLE, slot.getStatus());
        verify(auditLogService).log(eq("u1"), eq("RESERVATION_CANCEL"), anyString());
    }

    @Test
    void checkoutReservation_marksCompletedAndFreesSlot() {
        slot.setStatus(ParkingSlot.SlotStatus.RESERVED);
        Reservation r = new Reservation(user, slot, LocalDateTime.now(), LocalDateTime.now().plusHours(1), "qr");
        r.setId(5L);
        r.setStatus(Reservation.ReservationStatus.ACTIVE);
        when(reservationRepository.findById(5L)).thenReturn(Optional.of(r));
        when(reservationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Reservation result = service.checkoutReservation(5L, "security1");

        assertEquals(Reservation.ReservationStatus.COMPLETED, result.getStatus());
        assertEquals(ParkingSlot.SlotStatus.AVAILABLE, slot.getStatus());
        verify(auditLogService).log(eq("security1"), eq("RESERVATION_CHECKOUT"), anyString());
    }

    @Test
    void checkoutReservation_rejectsNonActive() {
        Reservation r = new Reservation(user, slot, LocalDateTime.now(), LocalDateTime.now().plusHours(1), "qr");
        r.setId(5L);
        r.setStatus(Reservation.ReservationStatus.EXPIRED);
        when(reservationRepository.findById(5L)).thenReturn(Optional.of(r));

        assertThrows(RuntimeException.class, () -> service.checkoutReservation(5L, "security1"));
    }

    @Test
    void expireReservations_expiresPastDueAndFreesSlot() {
        slot.setStatus(ParkingSlot.SlotStatus.RESERVED);
        Reservation r = new Reservation(user, slot,
                LocalDateTime.now().minusHours(2),
                LocalDateTime.now().minusHours(1),
                "qr");
        r.setStatus(Reservation.ReservationStatus.ACTIVE);
        when(reservationRepository.findByStatus(Reservation.ReservationStatus.ACTIVE))
                .thenReturn(List.of(r));
        when(reservationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.expireReservations();

        assertEquals(Reservation.ReservationStatus.EXPIRED, r.getStatus());
        assertEquals(ParkingSlot.SlotStatus.AVAILABLE, slot.getStatus());
    }

    @Test
    void updateSlotStatus_logsAuditWithPreviousStatus() {
        slot.setStatus(ParkingSlot.SlotStatus.AVAILABLE);
        when(slotRepository.findById(10L)).thenReturn(Optional.of(slot));
        when(slotRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.updateSlotStatus(10L, ParkingSlot.SlotStatus.MAINTENANCE, "security1");

        ArgumentCaptor<String> detailsCaptor = ArgumentCaptor.forClass(String.class);
        verify(auditLogService).log(eq("security1"), eq("SLOT_STATUS_UPDATE"), detailsCaptor.capture());
        assertTrue(detailsCaptor.getValue().contains("AVAILABLE -> MAINTENANCE"));
        assertEquals(ParkingSlot.SlotStatus.MAINTENANCE, slot.getStatus());
    }
}

