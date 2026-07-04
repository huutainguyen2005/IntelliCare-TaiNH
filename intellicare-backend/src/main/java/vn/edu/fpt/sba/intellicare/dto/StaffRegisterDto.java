package vn.edu.fpt.sba.intellicare.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class StaffRegisterDto {
    @NotBlank(message = "Tên đăng nhập không được để trống")
    @Size(min = 4, max = 50, message = "Tên đăng nhập phải từ 4 đến 50 ký tự")
    private String username;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự")
    private String password; // Mật khẩu thô do Admin nhập vào form

    @NotBlank(message = "Họ và tên nhân viên không được để trống")
    private String fullName;

    @NotBlank(message = "Vai trò không được để trống")
    private String role; // 'Admin', 'Nurse', hoặc 'Doctor'
}
