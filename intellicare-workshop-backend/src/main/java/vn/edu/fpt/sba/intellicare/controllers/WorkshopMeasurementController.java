package vn.edu.fpt.sba.intellicare.controllers;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.sba.intellicare.dto.request.RegisterParticipantDTO;
import vn.edu.fpt.sba.intellicare.services.IWorkshopService;

import java.util.Map;

/**
 * API công khai (không JWT) - sinh viên tự thao tác trên điện thoại của
 * mình sau khi quét QR ở standee.
 */
@RestController
@RequestMapping("/api/workshop")
@RequiredArgsConstructor
public class WorkshopMeasurementController {

    private final IWorkshopService workshopService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterParticipantDTO request) {
        try {
            return ResponseEntity.ok(workshopService.register(request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/sessions/{sessionId}/start-weighing")
    public ResponseEntity<?> startWeighing(@PathVariable Long sessionId) {
        try {
            return ResponseEntity.ok(workshopService.startWeighing(sessionId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<?> getStatus(@PathVariable Long sessionId) {
        try {
            return ResponseEntity.ok(workshopService.getStatus(sessionId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /** ESP32 gọi - bảo vệ bằng DeviceApiKeyFilter (X-Device-Key), không JWT */
    @PostMapping("/measurements/submit")
    public ResponseEntity<?> submitMeasurement(@RequestBody Map<String, Object> payload) {
        try {
            String deviceId = String.valueOf(payload.get("deviceId"));
            String rawHex = payload.get("rawHex") != null ? String.valueOf(payload.get("rawHex")) : null;
            Double heightCm = payload.get("heightCm") != null
                    ? Double.valueOf(String.valueOf(payload.get("heightCm")))
                    : null;
            // Chỉ dùng khi MOCK_BYPASS_ENABLED=true và rawHex="MOCK" (test bằng Swagger)
            Double mockWeightKg = payload.get("mockWeightKg") != null
                    ? Double.valueOf(String.valueOf(payload.get("mockWeightKg")))
                    : null;

            workshopService.recordMeasurement(deviceId, rawHex, heightCm, mockWeightKg);
            return ResponseEntity.ok(Map.of("message", "OK"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
