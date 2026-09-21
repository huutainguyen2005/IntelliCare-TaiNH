package vn.edu.fpt.sba.intellicare.dto.response;

public record DashboardStatsDTO(
        long totalParticipants,
        long completedCount,
        long pendingCount,
        Double avgWeightKg,
        Double avgHeightCm,
        Double avgBmi
) {}
