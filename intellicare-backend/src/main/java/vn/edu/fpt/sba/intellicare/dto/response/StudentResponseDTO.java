package vn.edu.fpt.sba.intellicare.dto.response;

public record StudentResponseDTO(
        Integer studentId,
        Integer classId,
        String className,
        String fullName,
        String dob,
        String gender,
        Integer indexNumber,
        Boolean isActive,
        Double latestWeightKg
) {}
