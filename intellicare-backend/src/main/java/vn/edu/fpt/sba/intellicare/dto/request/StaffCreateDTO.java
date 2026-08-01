package vn.edu.fpt.sba.intellicare.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import vn.edu.fpt.sba.intellicare.enums.Role;

public record StaffCreateDTO(
        @NotBlank(message = "Tên đăng nhập không được để trống")
        @Size(min = 4, max = 50, message = "Tên đăng nhập phải từ 4 đến 50 ký tự")
        String username,

        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự")
        String password,

        @NotBlank(message = "Họ và tên không được để trống")
        String fullName,

        @NotNull(message = "Vai trò không được để trống")
        Role role,

        @NotNull(message = "Giới tính không được để trống")
        Boolean gender,

        Integer managerId
) {}