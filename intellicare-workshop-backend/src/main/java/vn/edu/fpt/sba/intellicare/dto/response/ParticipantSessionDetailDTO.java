package vn.edu.fpt.sba.intellicare.dto.response;

public record ParticipantSessionDetailDTO(
        String fullName,
        String email,
        String completedAt,
        Double weightKg,
        Double heightCm,
        Double bmi
) {}