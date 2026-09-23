package vn.edu.fpt.sba.intellicare.dto.response;

import java.time.LocalDateTime;

public record WeightLogResponseDTO(
        Integer logId,
        String patientName,
        Double weightKg,
        String deviceId,
        LocalDateTime measuredAt
) {}