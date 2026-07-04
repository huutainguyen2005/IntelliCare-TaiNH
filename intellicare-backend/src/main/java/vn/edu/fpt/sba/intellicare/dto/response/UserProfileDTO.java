package vn.edu.fpt.sba.intellicare.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserProfileDTO {
    private Integer id;
    private String identifier; // Số điện thoại hoặc Username
    private String fullName;
    private String role;
    private String email;
    private String faceImageUrl;
    private Double weightKg;   // Thêm trường cân nặng cho Patient
}