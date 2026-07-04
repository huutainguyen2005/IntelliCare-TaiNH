package vn.edu.fpt.sba.intellicare.services;

import vn.edu.fpt.sba.intellicare.dto.response.MeasurementSessionResponseDTO;
import vn.edu.fpt.sba.intellicare.entities.Patient;

public interface IMeasurementSessionService {
    // Khởi tạo phiên đo khi quét QR
    void initSession(Integer patientId, String deviceId);

    // Lưu kết quả cân nặng từ thiết bị IoT gửi lên
    void recordWeight(String deviceId, Double weightKg);

    // Lấy thông tin phiên đo mới nhất để Frontend gọi Polling
    MeasurementSessionResponseDTO getLatestSession(String deviceId);

    MeasurementSessionResponseDTO startSessionFromQr(String deviceId, String rawQrData);

    MeasurementSessionResponseDTO initSessionForExistingPatient(String deviceId, Patient patient);
}

