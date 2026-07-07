package vn.edu.fpt.sba.intellicare.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import lombok.RequiredArgsConstructor;
import vn.edu.fpt.sba.intellicare.dto.response.WeightLogResponseDTO;
import vn.edu.fpt.sba.intellicare.entities.Patient;
import vn.edu.fpt.sba.intellicare.repositories.PatientRepository;
import vn.edu.fpt.sba.intellicare.services.IWeightLogService;

import java.util.List;

@RestController
@RequestMapping("/api/weight-logs")
@RequiredArgsConstructor
public class WeightLogController {

    private final IWeightLogService weightLogService;
    private final PatientRepository patientRepository;

    /**
     * API dành cho Bệnh nhân tự xem lịch sử đo cân nặng của chính mình
     * GET /api/weight-logs/me
     */
    @GetMapping("/me")
    public ResponseEntity<?> getMyWeightLogs(Authentication authentication) {
        String identifier = authentication.getName(); // Có thể là SĐT hoặc Email
        Patient patient;

        // Tự động nhận diện định danh dựa trên ký tự '@'
        if (identifier.contains("@")) {
            patient = patientRepository.findByEmail(identifier)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy dữ liệu bệnh nhân với Email: " + identifier));
        } else {
            patient = patientRepository.findByPhoneNumber(identifier)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy dữ liệu bệnh nhân với Số điện thoại: " + identifier));
        }

        List<WeightLogResponseDTO> logDTOs = weightLogService.getLogsByPatientId(patient.getPatientId());
        return ResponseEntity.ok(logDTOs);
    }

    /**
     * API dành cho Nhân viên y tế (Staff) xem lịch sử đo của một bệnh nhân bất kỳ qua ID
     * GET /api/weight-logs/patient/{patientId}
     */
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<?> getWeightLogsByPatientId(@PathVariable Integer patientId) {
        List<WeightLogResponseDTO> logDTOs = weightLogService.getLogsByPatientId(patientId);
        return ResponseEntity.ok(logDTOs);
    }
}