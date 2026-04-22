package parking.repository;

import parking.model.Reservation;
import parking.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findByUser(User user);
    List<Reservation> findByUserOrderByStartTimeDesc(User user);
    List<Reservation> findByStatus(Reservation.ReservationStatus status);
    Optional<Reservation> findByQrCode(String qrCode);

    @Query("SELECT r FROM Reservation r WHERE r.status = 'ACTIVE' AND r.endTime BETWEEN :now AND :threshold")
    List<Reservation> findExpiringReservations(@Param("now") LocalDateTime now, @Param("threshold") LocalDateTime threshold);

    @Query("SELECT r FROM Reservation r WHERE r.startTime >= :start AND r.startTime <= :end")
    List<Reservation> findByDateRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * Overlap check: returns any ACTIVE reservation on the same slot whose
     * [startTime, endTime] window intersects the provided window.
     * Two intervals overlap iff  A.start < B.end  AND  A.end > B.start
     */
    @Query("SELECT r FROM Reservation r " +
           "WHERE r.slot.id = :slotId " +
           "AND r.status = 'ACTIVE' " +
           "AND r.startTime < :endTime " +
           "AND r.endTime > :startTime")
    List<Reservation> findOverlapping(@Param("slotId") Long slotId,
                                      @Param("startTime") LocalDateTime startTime,
                                      @Param("endTime") LocalDateTime endTime);

    long countByStatus(Reservation.ReservationStatus status);

    @Query("SELECT COUNT(r) FROM Reservation r WHERE r.startTime >= :start AND r.startTime <= :end")
    long countByDateRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
