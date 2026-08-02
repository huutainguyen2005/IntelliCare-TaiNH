package vn.edu.fpt.sba.intellicare.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record PatientDetailResponseDTO (Integer patientId,
                                        String patientCode,
                                        String phoneNumber,
                                        String email,
                                        String idCard,
                                        String address,
                                        String fullName,
                                        LocalDate dob,
                                        String gender,
                                        Double heightCm,
                                        String faceImageUrl,
                                        String accountStatus,
                                        Boolean isActive,
                                        LocalDateTime createdAt,
                                        LocalDateTime activatedAt,
                                        List<WeightLogResponseDTO> weightLog){

}
