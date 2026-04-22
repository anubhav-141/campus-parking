package parking.service;

import parking.model.Notification;
import parking.model.Reservation;
import parking.model.User;
import parking.repository.NotificationRepository;
import parking.repository.ReservationRepository;
import parking.repository.UserRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final ReservationRepository reservationRepository;
    private final UserRepository userRepository;
    private final ReservationService reservationService;

    public NotificationService(NotificationRepository notificationRepository,
                               ReservationRepository reservationRepository,
                               UserRepository userRepository,
                               @Lazy ReservationService reservationService) {
        this.notificationRepository = notificationRepository;
        this.reservationRepository = reservationRepository;
        this.userRepository = userRepository;
        this.reservationService = reservationService;
    }

    public Notification createNotification(User user, String message) {
        Notification notification = new Notification(user, message);
        return notificationRepository.save(notification);
    }

    public List<Notification> getUserNotifications(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return notificationRepository.findByUserOrderByCreatedAtDesc(user);
    }

    public long getUnreadCount(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return notificationRepository.countByUserAndIsReadFalse(user);
    }

    /**
     * Marks a single notification as read, but only if it actually belongs to
     * the caller. This closes a gap where any authenticated user could PUT any
     * notification ID and flip the read flag.
     */
    public void markAsRead(Long notificationId, String username) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        if (!notification.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Not authorized");
        }
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    public void markAllAsRead(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<Notification> unread = notificationRepository.findByUserAndIsReadFalseOrderByCreatedAtDesc(user);
        for (Notification n : unread) {
            n.setRead(true);
            notificationRepository.save(n);
        }
    }

    /**
     * Runs every 60 seconds:
     * 1. Expires any past-due active reservations
     * 2. Sends warning notifications for reservations expiring within 5 minutes
     */
    @Scheduled(fixedRate = 60000)
    public void checkExpiringReservations() {
        reservationService.expireReservations();

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime threshold = now.plusMinutes(5);

        List<Reservation> expiring = reservationRepository.findExpiringReservations(now, threshold);

        for (Reservation reservation : expiring) {
            String message = "⚠️ Your reservation for slot " + reservation.getSlot().getSlotNumber() +
                    " expires in less than 5 minutes!";

            // Simple dedup: check if a similar notification was created in the last 5 mins
            List<Notification> recent = notificationRepository.findByUserOrderByCreatedAtDesc(reservation.getUser());
            boolean alreadyNotified = recent.stream()
                    .anyMatch(n -> n.getMessage().contains("expires in less than 5 minutes") &&
                            n.getMessage().contains(reservation.getSlot().getSlotNumber()) &&
                            n.getCreatedAt().isAfter(now.minusMinutes(5)));

            if (!alreadyNotified) {
                createNotification(reservation.getUser(), message);
            }
        }
    }
}
