package vn.edu.fpt.sba.intellicare.dto.request;

import jakarta.validation.constraints.NotBlank;

public record KioskHardwareDataDTO(
    @NotBlank(message = "Thiếu mã định danh của cân (device_id)")
    String deviceId,
    
    String rawHex,
    
    Double heightCm
) {}
