package vn.edu.fpt.sba.intellicare.dto.request;

import jakarta.validation.constraints.NotBlank;

public record IndividualLoginDTO(
        @NotBlank(message = "Vui lòng nhập SDT hoặc Email")
        String identifier,

        @NotBlank(message = "Vui lòng nhập mật khẩu")
        String password
) {}
