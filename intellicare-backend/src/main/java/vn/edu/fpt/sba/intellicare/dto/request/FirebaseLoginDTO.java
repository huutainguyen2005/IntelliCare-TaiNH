package vn.edu.fpt.sba.intellicare.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class FirebaseLoginDTO {
    @NotBlank(message = "Thiếu mã xác thực an toàn từ Firebase Token")
    private String firebaseToken; // idToken từ Firebase Client gửi lên để Backend giải mã lấy SĐT
}
