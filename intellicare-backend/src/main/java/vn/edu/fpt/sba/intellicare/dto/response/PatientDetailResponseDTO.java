package vn.edu.fpt.sba.intellicare.dto.response;

import java.time.LocalDate;
import java.util.List;

public record PatientDetailResponseDTO (Integer patientId,
                                        String patientCode,
                                        String phoneNumber,
                                        String fullName,
                                        LocalDate dob,
                                        String gender,
                                        Double heightCm,
                                        String faceImageUrl ,
                                        List<WeightLogResponseDTO> weightLog){

}
