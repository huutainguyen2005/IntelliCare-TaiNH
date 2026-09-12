package vn.edu.fpt.sba.intellicare.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record StartRollCallDTO(
        @NotNull(message = "Mã lớp không được để trống")
        Integer classId,

        @NotBlank(message = "Mã thiết bị không được để trống")
        String deviceId
) {}
