package vn.edu.fpt.sba.intellicare.dto.response;

import lombok.Data;
import vn.edu.fpt.sba.intellicare.enums.AccountStatus;

@Data
public class AuthResponseDTO {
    private String token;
    private String role;
    private String fullName;
    private String accountStatus;

    // Constructor cho Bệnh nhân (Nhận Enum và tự động chuyển sang String)
    public AuthResponseDTO(String token, String role, String fullName, AccountStatus accountStatus) {
        this.token = token;
        this.role = role;
        this.fullName = fullName;
        this.accountStatus = (accountStatus != null) ? accountStatus.name() : AccountStatus.ACTIVE.name();
    }

    // Constructor cho Staff (Mặc định là ACTIVE vì Staff không qua Kiosk)
    public AuthResponseDTO(String token, String role, String fullName) {
        this.token = token;
        this.role = role;
        this.fullName = fullName;
        this.accountStatus = AccountStatus.ACTIVE.name();
    }
}