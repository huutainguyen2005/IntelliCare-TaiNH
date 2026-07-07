package vn.edu.fpt.sba.intellicare.dto.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDate;

@Data
public class PatientRegisterDTO {

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(regexp = "^0(3[2-9]|5[25689]|7[06789]|8[1-9]|9\\d)\\d{7}$", message = "Số điện thoại không hợp lệ")
    private String phoneNumber;

    @Email(message = "Email không hợp lệ")
    private String email;

    private String password;

    @NotBlank(message = "Họ tên không được để trống")
    @Size(max = 50, message = "Họ tên không được vượt quá 50 ký tự")
    @Pattern(regexp = "^\\p{L}+([\\s]+\\p{L}+)+$", message = "Họ và tên không hợp lệ")
    private String fullName;

    @Past(message = "Ngày sinh không được vượt quá ngày hiện tại")
    private LocalDate dob;

    private String gender;

    private String idCard;

    private String address;

    private String faceImageUrl;
    
    private String otp;
}