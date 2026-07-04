package vn.edu.fpt.sba.intellicare.services;

import vn.edu.fpt.sba.intellicare.dto.response.WeightLogResponseDTO;

import java.util.List;

public interface IWeightLogService {
    List<WeightLogResponseDTO> getLogsByPatientId(Integer patientId);
}
