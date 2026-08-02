package vn.edu.fpt.sba.intellicare.dto.response;

import java.util.List;

public record DashboardStatsDTO(
        // ===== Kích hoạt tài khoản Bệnh nhân =====
        long totalPatients,
        long activatedPatients,
        long pendingPatients,        // Đã quét CCCD nhưng CHƯA kích hoạt
        double activationRatePercent, // % đã kích hoạt / tổng
        Double avgActivationHours,    // Thời gian TB từ lúc tạo -> kích hoạt (null nếu chưa có ai kích hoạt)
        long lockedPatients,

        // ===== Danh sách "có nguy cơ bỏ cuộc" - tạo lâu mà chưa kích hoạt =====
        List<StaleActivationDTO> staleActivations,

        // ===== Nhân sự =====
        long totalStaff,
        long totalDoctors,
        long totalNurses,
        long activeStaff,
        long lockedStaff,

        // ===== Thiết bị =====
        long totalDevices,
        long activeDevices,

        // ===== Hoạt động đo =====
        long measurementsToday,
        long measurementsThisWeek,
        long measurementsThisMonth,
        long totalWeightLogsAllTime
) {
    public record StaleActivationDTO(
            Integer patientId,
            String fullName,
            String phoneNumber,
            String createdAt, // ISO string, FE tự format
            long daysSinceCreated
    ) {}
}
