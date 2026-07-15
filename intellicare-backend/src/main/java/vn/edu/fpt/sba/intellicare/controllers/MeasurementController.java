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
            
            if (rawQrData == null || rawQrData.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Không nhận được dữ liệu QR");
            }

            String cleanData = rawQrData.trim().replaceAll("^[\\x00-\\x1F\\x7F]+|[\\x00-\\x1F\\x7F]+$", "");
            String[] parts = cleanData.split("\\s*\\|\\s*");
            if (parts.length < 7) {
                return ResponseEntity.badRequest().body("Mã QR thiếu thông tin CCCD.");
            }

            String idCard = parts[0];
            String fullName = parts[2];
            String dobStr = parts[3]; 
            String genderStr = parts[4];
            String address = parts[5];

            // LẤY HOẶC TẠO DEVICE
            Device device = deviceRepository.findByDeviceId(deviceId)
                    .orElseGet(() -> {
                        Device demoDevice = new Device();
                        demoDevice.setDeviceId(deviceId);
                        demoDevice.setLocation("Kiosk Thông Minh");
                        demoDevice.setStatus("Active");
                        return deviceRepository.save(demoDevice);
                    });

            // TÌM HOẶC TẠO PATIENT TỪ CCCD (KHÔNG CẦN SĐT/EMAIL)
            Optional<Patient> patientOpt = patientRepository.findByIdCard(idCard);
            Patient patient;
            
            if (patientOpt.isEmpty()) {
                patient = new Patient();
                // Lấy ID lớn nhất để tạo mã BN
                Integer maxId = patientRepository.findMaxPatientId();
                patient.setPatientCode(String.format("BN%06d", maxId + 1));
                
                patient.setIdCard(idCard);
                patient.setFullName(fullName);
                patient.setGender(genderStr);
                patient.setAddress(address);
                
                // Gán tạm SĐT bằng CCCD để vượt qua Unique Constraint của Database
                patient.setPhoneNumber("CCCD-" + idCard);
                
                // Trạng thái chờ kích hoạt ở nhà
                patient.setAccountStatus(vn.edu.fpt.sba.intellicare.enums.AccountStatus.PENDING_PASSWORD);
                
                try {
                    java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("ddMMyyyy");
                    patient.setDob(java.time.LocalDate.parse(dobStr, formatter));
                } catch (Exception e) {
                    System.err.println("Không thể parse ngày sinh CCCD: " + dobStr);
                }
                
                patient = patientRepository.save(patient);
            } else {
                patient = patientOpt.get();
            }

            // KHỞI TẠO PHIÊN ĐO NGAY LẬP TỨC
            MeasurementSessionResponseDTO session = measurementService.initSessionForExistingPatient(deviceId, patient);
            
            return ResponseEntity.ok(session);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Lỗi Server: " + e.getMessage());
        }
    }
}