package vn.edu.fpt.sba.intellicare.dto.response;

import java.time.LocalDateTime;

public record MeasurementSessionResponseDTO(
        Integer sessionId,
        String deviceId,
        String deviceLocation,
        Integer patientId,
        String patientName,
        String status,
        LocalDateTime createdAt,
        Double weightKg
) {}