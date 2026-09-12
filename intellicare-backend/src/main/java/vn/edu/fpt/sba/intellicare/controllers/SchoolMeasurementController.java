package vn.edu.fpt.sba.intellicare.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.sba.intellicare.services.IRollCallService;

import java.util.Map;

/**
 * API dành cho ESP32 gửi cân nặng của học sinh lên - KHÔNG có JWT (thiết bị
 * không đăng nhập), bảo vệ bằng Device API Key (DeviceApiKeyFilter, khớp
 * cấu hình y hệt /api/measurements/** bên Bệnh viện).
 */
@RestController
@RequestMapping("/api/school-measurements")
@RequiredArgsConstructor
public class SchoolMeasurementController {

    private final IRollCallService rollCallService;

    @PostMapping("/submit")
    public ResponseEntity<?> submitWeight(@RequestBody Map<String, Object> payload) {
        try {
            String deviceId = String.valueOf(payload.get("deviceId"));
            Double weightKg = Double.valueOf(String.valueOf(payload.get("weightKg")));

            rollCallService.recordWeight(deviceId, weightKg);
            return ResponseEntity.ok(Map.of("message", "Ghi nhận cân nặng thành công"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
