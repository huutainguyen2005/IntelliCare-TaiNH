package vn.edu.fpt.sba.intellicare.dto.request;

import jakarta.validation.constraints.NotBlank;

public record FirebaseLoginDTO(
    @NotBlank(message = "Thiếu mã xác thực an toàn từ Firebase Token")
    String firebaseToken
) {}