package vn.edu.fpt.sba.intellicare.services.impl;

import org.springframework.stereotype.Service;
import vn.edu.fpt.sba.intellicare.dto.response.PatientDetailResponseDTO;
import vn.edu.fpt.sba.intellicare.repositories.DeviceRepository;
import vn.edu.fpt.sba.intellicare.services.IDeviceService;

@Service
public class DeviceServiceImpl implements IDeviceService {
    private DeviceRepository deviceRepository;

    public DeviceServiceImpl(DeviceRepository deviceRepository) {
        this.deviceRepository = deviceRepository;
    }

    @Override
    public PatientDetailResponseDTO findById(String id) {
        return null;
    }
}
