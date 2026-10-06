package vn.edu.fpt.sba.intellicare.jobs;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import vn.edu.fpt.sba.intellicare.entities.WorkshopParticipant;
import vn.edu.fpt.sba.intellicare.entities.WorkshopSession;
import vn.edu.fpt.sba.intellicare.enums.WorkshopSessionStatus;
import vn.edu.fpt.sba.intellicare.exceptions.EmailQuotaExceededException;
import vn.edu.fpt.sba.intellicare.repositories.WorkshopSessionRepository;
import vn.edu.fpt.sba.intellicare.services.IWorkshopEmailService;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Gửi bù các email kết quả chưa gửi được (VD Resend free hết hạn mức 100 email/ngày).
 * <p>
 * - Mỗi phút lấy tối đa {@code batch-size} email chưa gửi, CŨ NHẤT TRƯỚC.
 * - Gặp EmailQuotaExceededException -> dừng ngay; email service tự tạm ngừng gọi Resend
 *   một lúc, các lần chạy sau sẽ gửi tiếp khi hạn mức hồi lại. Không email nào bị mất.
 * - Giữ nhịp {@code spacing-ms} giữa 2 email để không vượt giới hạn tốc độ của Resend.
 * - Bỏ qua phiên vừa hoàn thành dưới {@code min-age-seconds} (lần gửi tức thì còn đang xử lý)
 *   để tránh gửi trùng; chỉ gửi bù trong {@code max-age-hours} giờ gần nhất.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EmailRetryJob {

    private final WorkshopSessionRepository sessionRepository;
    private final IWorkshopEmailService emailService;

    @Value("${email.retry.min-age-seconds:30}")
    private long minAgeSeconds;

    @Value("${email.retry.max-age-hours:72}")
    private long maxAgeHours;

    @Value("${email.retry.batch-size:20}")
    private int batchSize;

    @Value("${email.retry.spacing-ms:600}")
    private long spacingMs;

    @Value("${email.retry.max-consecutive-failures:3}")
    private int maxConsecutiveFailures;

    @Value("${email.retry.failure-pause-minutes:5}")
    private long failurePauseMinutes;

    // Tự tạm nghỉ khi liên tiếp lỗi (thường là lỗi cấu hình: domain chưa verify, sai API key...)
    private volatile OffsetDateTime pausedUntil;

    @Scheduled(fixedDelayString = "${email.retry.interval-ms:60000}",
            initialDelayString = "${email.retry.initial-delay-ms:60000}")
    public void retryUnsentEmails() {
        OffsetDateTime now = OffsetDateTime.now();
        if (pausedUntil != null && now.isBefore(pausedUntil)) {
            return;
        }

        List<WorkshopSession> batch = sessionRepository.findUnsentEmails(
                WorkshopSessionStatus.Completed,
                now.minusHours(maxAgeHours),
                now.minusSeconds(minAgeSeconds),
                PageRequest.of(0, batchSize));
        if (batch.isEmpty()) {
            return;
        }

        int sent = 0;
        int consecutiveFailures = 0;
        for (WorkshopSession session : batch) {
            try {
                WorkshopParticipant participant = session.getParticipant();
                emailService.sendResultEmail(
                        participant.getEmail(),
                        participant.getFullName(),
                        orZero(session.getWeightKg()),
                        orZero(session.getHeightCm()),
                        orZero(session.getBmi()));
                sessionRepository.markEmailSent(session.getId());
                sent++;
                consecutiveFailures = 0;
            } catch (EmailQuotaExceededException e) {
                log.warn("Resend đang hết hạn mức - dừng gửi bù, các email còn lại sẽ gửi ở lần chạy sau");
                break;
            } catch (Exception e) {
                log.error("Gửi bù email thất bại (session {}): {}", session.getId(), e.getMessage());
                if (++consecutiveFailures >= maxConsecutiveFailures) {
                    pausedUntil = now.plusMinutes(failurePauseMinutes);
                    log.error("Lỗi liên tiếp {} lần - tạm nghỉ gửi bù {} phút (kiểm tra RESEND_API_KEY / domain)",
                            consecutiveFailures, failurePauseMinutes);
                    break;
                }
            }

            if (!pauseBetweenEmails()) {
                break;
            }
        }

        if (sent > 0) {
            log.info("Đã gửi bù {} email kết quả", sent);
        }
    }

    private boolean pauseBetweenEmails() {
        if (spacingMs <= 0) {
            return true;
        }
        try {
            Thread.sleep(spacingMs);
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    private static double orZero(Double value) {
        return value != null ? value : 0;
    }
}