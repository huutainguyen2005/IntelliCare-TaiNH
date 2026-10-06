package vn.edu.fpt.sba.intellicare.repositories;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.sba.intellicare.entities.WorkshopSession;
import vn.edu.fpt.sba.intellicare.enums.WorkshopSessionStatus;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkshopSessionRepository extends JpaRepository<WorkshopSession, Long> {

    Optional<WorkshopSession> findByPublicId(UUID publicId);

    Optional<WorkshopSession> findTopByDeviceIdAndStatusOrderByCreatedAtDesc(
            String deviceId, WorkshopSessionStatus status);

    Optional<WorkshopSession> findTopByDeviceIdOrderByCreatedAtDesc(String deviceId);

    // Phiên đang đo CÒN HẠN (startedAt > cutoff) - phiên null/quá hạn bị loại tự động
    Optional<WorkshopSession> findTopByDeviceIdAndStatusAndStartedAtAfterOrderByStartedAtDesc(
            String deviceId, WorkshopSessionStatus status, OffsetDateTime cutoff);

    List<WorkshopSession> findByDeviceIdAndStatus(String deviceId, WorkshopSessionStatus status);

    // Lượt đo đang diễn ra (mọi trạm) - dùng cho trang Admin
    Optional<WorkshopSession> findTopByStatusAndStartedAtAfterOrderByStartedAtDesc(
            WorkshopSessionStatus status, OffsetDateTime cutoff);

    List<WorkshopSession> findByStatus(WorkshopSessionStatus status);

    // New: get completed sessions ordered by completedAt desc for admin dashboard details
    List<WorkshopSession> findByStatusOrderByCompletedAtDesc(WorkshopSessionStatus status);

    // Cho email worker - tim cac phien Completed nhung chua gui email
    // thanh cong (phong khi Resend loi tam thoi, retry duoc)
    List<WorkshopSession> findByStatusAndEmailSentFalse(WorkshopSessionStatus status);

    // Email kết quả chưa gửi được (VD Resend hết hạn mức) - cũ nhất trước, kèm luôn participant
    // (join fetch) để job chạy nền không bị LazyInitializationException.
    @Query("select s from WorkshopSession s join fetch s.participant "
            + "where s.status = :status and s.emailSent = false "
            + "and s.completedAt between :from and :to order by s.completedAt asc")
    List<WorkshopSession> findUnsentEmails(@Param("status") WorkshopSessionStatus status,
                                           @Param("from") OffsetDateTime from,
                                           @Param("to") OffsetDateTime to,
                                           Pageable pageable);

    @Modifying
    @Transactional
    @Query("update WorkshopSession s set s.emailSent = true where s.id = :id")
    int markEmailSent(@Param("id") Long id);

    long countByStatus(WorkshopSessionStatus status);
}