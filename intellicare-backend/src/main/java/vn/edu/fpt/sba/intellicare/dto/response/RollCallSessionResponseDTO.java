package vn.edu.fpt.sba.intellicare.dto.response;

public record RollCallSessionResponseDTO(
        Integer rollCallSessionId,
        Integer classId,
        String className,
        String status,          // InProgress | Completed (trang thai CA buoi diem danh)
        Integer currentStudentId,
        String currentStudentName,
        Integer currentStudentIndex,
        String measurementStatusLabel, // AwaitingStart | Pending | Completed (trang thai lan can cua HOC SINH hien tai)
        Double lastWeightKg     // co gia tri khi hoc sinh hien tai da Completed
) {}
