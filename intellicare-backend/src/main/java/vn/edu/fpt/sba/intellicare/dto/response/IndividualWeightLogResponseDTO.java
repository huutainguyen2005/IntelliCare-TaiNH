package vn.edu.fpt.sba.intellicare.dto.response;

import java.time.LocalDateTime;

public record IndividualWeightLogResponseDTO(
        Integer logId,
        Double weightKg,
        LocalDateTime measuredAt
) {}
