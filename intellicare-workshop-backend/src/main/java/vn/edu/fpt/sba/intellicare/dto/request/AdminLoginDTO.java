package vn.edu.fpt.sba.intellicare.dto.request;

import jakarta.validation.constraints.NotBlank;

public record AdminLoginDTO(
        @NotBlank(message = "Vui lòng nhập tên đăng nhập")
        String username,

        @NotBlank(message = "Vui lòng nhập mật khẩu")
        String password
) {}
