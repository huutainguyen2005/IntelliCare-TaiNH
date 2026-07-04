package vn.edu.fpt.sba.intellicare.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class QrScanRequestDTO {
    @NotBlank(message = "Không xác định được ID của cân từ mã QR")
    private String deviceId;

    @NotNull(message = "ID bệnh nhân không được để trống")
    private Integer patientId;
}
