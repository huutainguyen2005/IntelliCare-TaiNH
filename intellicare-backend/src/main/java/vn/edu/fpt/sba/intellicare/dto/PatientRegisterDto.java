package vn.edu.fpt.sba.intellicare.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class PatientRegisterDto {
    @NotBlank(message = "Mã bệnh nhân hoặc số CCCD không được để trống")
    private String patientCode;

    // Thêm trường password
    @NotBlank(message = "Mật khẩu không được để trống")
    private String password;

    @NotBlank(message = "Họ và tên không được để trống")
    private String fullName;

    private LocalDate dob;
    private String gender;
    private Double heightCm;
    private String faceImageUrl;

    @NotBlank(message = "Thiếu mã xác thực an toàn từ Firebase Token")
    private String firebaseToken; // Token nhận từ Firebase Client SDK sau khi xác thực OTP thành công
}