package vn.edu.fpt.sba.intellicare.dto.request;

public record PatientUpdateDTO(
        String fullName,      // null = không đổi
        String gender,          // null = không đổi
        String address,          // null = không đổi
        String email,             // null = không đổi
        String phoneNumber         // null = không đổi
) {}
