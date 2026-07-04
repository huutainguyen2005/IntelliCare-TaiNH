package vn.edu.fpt.sba.intellicare.dto.request;

import lombok.Data;

@Data
public class LoginRequestDTO {
    private String identifier; // Dùng chung: số điện thoại (Patient) hoặc username (Staff)
    private String password;
}
