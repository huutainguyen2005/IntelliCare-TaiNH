package vn.edu.fpt.sba.intellicare.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class WeightHardwareDataDTO {
    @NotBlank(message = "Thiếu mã định danh của cân (device_id)")
    private String deviceId;

    @NotNull(message = "Chỉ số cân nặng không được để trống")
    private Double weightKg;
}
