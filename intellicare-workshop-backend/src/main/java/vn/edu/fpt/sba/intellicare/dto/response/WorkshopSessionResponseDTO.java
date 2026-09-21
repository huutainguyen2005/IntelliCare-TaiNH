package vn.edu.fpt.sba.intellicare.dto.response;

public record WorkshopSessionResponseDTO(
        Long sessionId,
        String status,       // AwaitingStart | Pending | Completed
        String fullName,
        String email,
        Double weightKg,
        Double heightCm,
        Double bmi
) {}
