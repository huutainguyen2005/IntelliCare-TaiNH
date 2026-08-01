package vn.edu.fpt.sba.intellicare.dto.response;

import vn.edu.fpt.sba.intellicare.enums.AccountStatus;

public record AuthResponseDTO(
    String token,
    String role,
    String fullName,
    String accountStatus
) {
    // Constructor phụ cho Bệnh nhân (Nhận Enum và tự động chuyển sang String)
    public AuthResponseDTO(String token, String role, String fullName, AccountStatus accountStatus) {
        this(
            token, 
            role, 
            fullName, 
            (accountStatus != null) ? accountStatus.name() : AccountStatus.ACTIVE.name()
        );
    }

    // Constructor phụ cho Staff (Mặc định là ACTIVE vì Staff không qua Kiosk)
    public AuthResponseDTO(String token, String role, String fullName) {
        this(
            token, 
            role, 
            fullName, 
            AccountStatus.ACTIVE.name()
        );
    }
}