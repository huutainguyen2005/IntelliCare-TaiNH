package vn.edu.fpt.sba.intellicare.dto.request;

import vn.edu.fpt.sba.intellicare.enums.Role;

public record StaffUpdateDTO(
        String fullName,        // null = không đổi
        Role role,               // null = không đổi (không cho đổi thành ADMIN)
        Boolean gender,           // null = không đổi
        Integer managerId,        // null = không đổi
        String password,          // null/rỗng = không đổi mật khẩu
        String email               // null = không đổi
) {}
