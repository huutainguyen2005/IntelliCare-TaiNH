package vn.edu.fpt.sba.intellicare.dto.response;

public record DeviceResponseDTO(
        String deviceId,
        String location,
        String status
) {}