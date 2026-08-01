package vn.edu.fpt.sba.intellicare.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record QrScanRequestDTO(
    @NotBlank(message = "Không xác định được ID của cân từ mã QR")
    String deviceId,

    @NotNull(message = "ID bệnh nhân không được để trống")
    Integer patientId
) {}