package vn.edu.fpt.sba.intellicare.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record IndividualRegisterDTO(
        @NotBlank(message = "Họ tên không được để trống")
        String fullName,

        String phoneNumber, // co the null neu dung email
        String email,       // co the null neu dung SDT

        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự")
        String password,

        String dob,     // dd/MM/yyyy, optional
        String gender   // optional
) {}
