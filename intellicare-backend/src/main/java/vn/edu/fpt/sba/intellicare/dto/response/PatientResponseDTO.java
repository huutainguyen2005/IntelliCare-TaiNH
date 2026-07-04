package vn.edu.fpt.sba.intellicare.dto.response;

import java.time.LocalDate;

public record PatientResponseDTO(
        Integer patientId,
        String patientCode,
        String fullName,
        LocalDate dob,
        String gender,
        String phoneNumber
) {}