package vn.edu.fpt.sba.intellicare.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record RegisterParticipantDTO(
        @NotBlank(message = "Vui lòng nhập Họ và tên")
        String fullName,

        @NotBlank(message = "Vui lòng nhập Email")
        @Email(message = "Email không hợp lệ")
        String email,

        @NotBlank(message = "Thiếu mã trạm cân")
        String deviceId
) {}
