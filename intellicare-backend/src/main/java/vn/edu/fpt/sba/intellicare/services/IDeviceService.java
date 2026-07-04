package vn.edu.fpt.sba.intellicare.services;

import vn.edu.fpt.sba.intellicare.dto.response.PatientDetailResponseDTO;

public interface IDeviceService {
    PatientDetailResponseDTO findById(String id);
}
