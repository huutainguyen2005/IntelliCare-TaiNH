package vn.edu.fpt.sba.intellicare.dto.response;

public record WorkshopSessionResponseDTO(
        String sessionId,    // publicId (UUID) - KHÔNG phải id tăng dần trong DB
        String status,       // AwaitingStart | Pending | Completed
        String fullName,
        String email,
        Double weightKg,
        Double heightCm,
        Double bmi,
        Boolean emailSent,
        String completedAt
) {}