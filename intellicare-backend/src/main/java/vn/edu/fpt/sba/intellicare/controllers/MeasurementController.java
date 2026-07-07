package vn.edu.fpt.sba.intellicare.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import lombok.RequiredArgsConstructor;
import vn.edu.fpt.sba.intellicare.dto.request.QrScanRequestDTO;
import vn.edu.fpt.sba.intellicare.dto.request.WeightHardwareDataDTO;
import vn.edu.fpt.sba.intellicare.dto.response.MeasurementSessionResponseDTO;
import vn.edu.fpt.sba.intellicare.entities.Device;
import vn.edu.fpt.sba.intellicare.entities.Patient;
import vn.edu.fpt.sba.intellicare.repositories.DeviceRepository;
import vn.edu.fpt.sba.intellicare.repositories.PatientRepository;
import vn.edu.fpt.sba.intellicare.services.IMeasurementSessionService;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/measurements")
@RequiredArgsConstructor
public class MeasurementController {

    private final IMeasurementSessionService measurementService;
    private final PatientRepository patientRepository;
    private final DeviceRepository deviceRepository;

    @PostMapping("/start")
    public ResponseEntity<String> initSession(@RequestBody QrScanRequestDTO request) {
        measurementService.initSession(request.getPatientId(), request.getDeviceId());
        return ResponseEntity.ok("Phiên đo đã sẵn sàng");
    }

    @PostMapping("/submit")
    public ResponseEntity<String> recordWeight(@RequestBody WeightHardwareDataDTO request) {
        measurementService.recordWeight(request.getDeviceId(), request.getWeightKg());
        return ResponseEntity.ok("Ghi nhận cân nặng thành công");
    }

    @GetMapping("/result")
    public ResponseEntity<?> getLatestResult(@RequestParam String deviceId) {
        try {
            MeasurementSessionResponseDTO result = measurementService.getLatestSession(deviceId);

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi: " + e.getMessage());
        }
    }

    @PostMapping("/scan-qr")
    public ResponseEntity<?> startSessionFromQr(@RequestBody Map<String, String> request) {
        try {
            String deviceId = request.get("deviceId");
            String rawQrData = request.get("rawQrData");

            MeasurementSessionResponseDTO result = measurementService.startSessionFromQr(deviceId, rawQrData);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Lỗi khi xử lý mã QR: " + e.getMessage());
        }
    }

    @PostMapping("/check-qr-auth")
    public ResponseEntity<?> checkQrAndAuth(@RequestBody Map<String, String> request) {
        try {
            String deviceId = request.get("deviceId");
            String rawQrData = request.get("rawQrData");

            if (rawQrData == null) {
                return ResponseEntity.badRequest().body("Không nhận được dữ liệu mã QR");
            }

            // Xóa mọi khoảng trắng, ký tự ẩn, dấu xuống dòng ở 2 đầu
            String cleanData = rawQrData.trim().replaceAll("^[\\x00-\\x1F\\x7F]+|[\\x00-\\x1F\\x7F]+$", "");

            System.out.println("========== DEBUG QUÉT QR ==========");
            System.out.println("Dữ liệu gốc nhận được: [" + cleanData + "]");

            // TÁCH CHUỖI AN TOÀN BẰNG REGEX (bỏ qua khoảng trắng vô tình lọt vào giữa các
            // dấu |)
            String[] parts = cleanData.split("\\s*\\|\\s*");

            System.out.println("Số lượng phần tử tách được: " + parts.length);

            if (parts.length < 7) {
                return ResponseEntity.badRequest()
                        .body("Mã QR thiếu trường thông tin (Chỉ tách được " + parts.length + " phần tử).");
            }

            String idCard = parts[0];

            // TỰ ĐỘNG TẠO THIẾT BỊ NẾU CHƯA CÓ (Tránh lỗi 500 khi quét máy mới)
            deviceRepository.findByDeviceId(deviceId)
                    .orElseGet(() -> {
                        Device demoDevice = new Device();
                        demoDevice.setDeviceId(deviceId);
                        demoDevice.setLocation("Trạm cân Demo");
                        demoDevice.setStatus("Active");
                        return deviceRepository.save(demoDevice);
                    });

            // KIỂM TRA BỆNH NHÂN TRONG DB
            Optional<Patient> patientOpt = patientRepository.findByIdCard(idCard);

            if (patientOpt.isPresent()) {
                // Bệnh nhân cũ -> Init phiên đo ngay lập tức
                MeasurementSessionResponseDTO session = measurementService.initSessionForExistingPatient(deviceId,
                        patientOpt.get());
                System.out.println("-> Đã tạo phiên cho bệnh nhân CŨ.");
                return ResponseEntity.ok(Map.of("isNew", false, "session", session));
            } else {
                // Bệnh nhân mới -> Gửi data để Frontend hiện form OTP
                System.out.println("-> Bệnh nhân MỚI. Yêu cầu frontend bật form OTP.");
                return ResponseEntity.ok(Map.of(
                        "isNew", true,
                        "parsedData", Map.of(
                                "idCard", idCard,
                                "fullName", parts[2],
                                "dob", parts[3],
                                "gender", parts[4],
                                "address", parts[5])));
            }
        } catch (Exception e) {
            System.err.println("LỖI CRITICAL TẠI BACKEND: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Lỗi Server: " + e.getMessage());
        }
    }
}