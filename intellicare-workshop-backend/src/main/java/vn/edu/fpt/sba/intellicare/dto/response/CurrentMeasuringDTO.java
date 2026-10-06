package vn.edu.fpt.sba.intellicare.dto.response;

/**
 * Người đang đứng "lượt đo" trên cân (đã bấm Sẵn sàng, còn hạn) - chỉ dành cho Admin.
 * startedAtMillis là epoch millis để frontend tự định dạng theo múi giờ của trình duyệt.
 * elapsedSeconds/timeoutSeconds do server tính, tránh lệch đồng hồ giữa server và máy admin.
 */
public record CurrentMeasuringDTO(
        String sessionId,
        String fullName,
        String email,
        long startedAtMillis,
        long elapsedSeconds,
        long timeoutSeconds
) {}