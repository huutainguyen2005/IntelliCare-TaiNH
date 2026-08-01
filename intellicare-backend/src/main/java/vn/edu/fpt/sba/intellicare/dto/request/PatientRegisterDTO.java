package vn.edu.fpt.sba.intellicare.dto.request;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record PatientRegisterDTO(
    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(regexp = "^0(3[2-9]|5[25689]|7[06789]|8[1-9]|9\\d)\\d{7}$", message = "Số điện thoại không hợp lệ")
    String phoneNumber,

    @Email(message = "Email không hợp lệ")
    String email,

    String password,

    @NotBlank(message = "Họ tên không được để trống")
    @Size(max = 50, message = "Họ tên không được vượt quá 50 ký tự")
    @Pattern(regexp = "^\\p{L}+([\\s]+\\p{L}+)+$", message = "Họ và tên không hợp lệ")
    String fullName,

    @Past(message = "Ngày sinh không được vượt quá ngày hiện tại")
    LocalDate dob,

    String gender,

    String idCard,

    String address,

    String faceImageUrl,
    
    String otp
) {}