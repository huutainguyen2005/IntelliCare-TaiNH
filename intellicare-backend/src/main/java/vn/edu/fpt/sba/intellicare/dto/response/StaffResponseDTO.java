package vn.edu.fpt.sba.intellicare.dto.response;

import vn.edu.fpt.sba.intellicare.enums.Role;

public record StaffResponseDTO(
        Integer staffId,
        String username,
        String fullName,
        Role role,
        Integer managerId, // Chỉ trả về ID của manager để phía Client tự xử lý
        Boolean gender,
        String email
) {

}