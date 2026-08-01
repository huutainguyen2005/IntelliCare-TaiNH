package vn.edu.fpt.sba.intellicare.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record WeightHardwareDataDTO(
    @NotBlank(message = "Thiếu mã định danh của cân (device_id)")
    String deviceId,

    @NotNull(message = "Chỉ số cân nặng không được để trống")
    Double weightKg
) {}