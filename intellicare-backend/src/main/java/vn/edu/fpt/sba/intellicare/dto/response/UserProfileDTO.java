package vn.edu.fpt.sba.intellicare.dto.response;

public record UserProfileDTO(
    Integer id,
    String identifier, // Số điện thoại hoặc Username
    String fullName,
    String role,
    String email,
    String faceImageUrl,
    Double weightKg   // Thêm trường cân nặng cho Patient
) {}