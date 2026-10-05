package vn.edu.fpt.sba.intellicare.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterParticipantDTO(
        @NotBlank(message = "Vui lòng nhập Họ và tên")
        @Size(min = 2, max = 100, message = "Họ và tên phải từ 2 đến 100 ký tự")
        @Pattern(regexp = "^\\p{L}[\\p{L}\\p{M}\\s'.-]*$",
                message = "Họ và tên chỉ được chứa chữ cái, không chứa số hoặc ký tự đặc biệt")
        String fullName,

        // (?=.{1,150}$) chặn chuỗi quá dài NGAY từ đầu để regex không bị backtrack nặng (ReDoS).
        // 150 = độ dài cột email trong DB.
        @NotBlank(message = "Vui lòng nhập Email")
        @Size(max = 150, message = "Email không được vượt quá 150 ký tự")
        @Pattern(regexp = "^(?=.{1,150}$)[A-Za-z0-9_%+-]+(\\.[A-Za-z0-9_%+-]+)*@([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\\.)+[A-Za-z]{2,}$",
                message = "Email không hợp lệ")
        String email,

        @NotBlank(message = "Thiếu mã trạm cân")
        @Size(max = 50, message = "Mã trạm cân không hợp lệ")
        String deviceId
) {}