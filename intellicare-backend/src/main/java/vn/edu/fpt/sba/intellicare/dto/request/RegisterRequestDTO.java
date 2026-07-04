package vn.edu.fpt.sba.intellicare.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public class RegisterRequestDTO {
    @NotBlank(message = "Họ và tên không được để trống")
    private String fullName;

    @NotNull(message = "Ngày sinh không được để trống")
    private LocalDate dob;

    @NotBlank(message = "Vui lòng nhập số điện thoại hoặc email")
    private String identifier;

    @NotBlank(message = "Giới tính không được để trống")
    private String gender;

    @NotBlank(message = "Mã OTP không được để trống")
    private String otp;

    // --- GETTERS AND SETTERS ---
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public LocalDate getDob() { return dob; }
    public void setDob(LocalDate dob) { this.dob = dob; }

    public String getIdentifier() { return identifier; }
    public void setIdentifier(String identifier) { this.identifier = identifier; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }
}
