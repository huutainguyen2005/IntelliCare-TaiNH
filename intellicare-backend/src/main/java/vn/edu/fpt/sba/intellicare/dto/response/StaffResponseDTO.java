package vn.edu.fpt.sba.intellicare.dto.response;

public record StaffResponseDTO(
        Integer staffId,
        String username,
        String fullName,
        String role,
        Integer managerId, // Chỉ trả về ID của manager để phía Client tự xử lý
        Boolean gender
) {

}