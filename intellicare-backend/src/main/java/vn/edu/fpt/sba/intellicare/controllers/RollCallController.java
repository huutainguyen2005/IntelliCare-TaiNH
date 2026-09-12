package vn.edu.fpt.sba.intellicare.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.sba.intellicare.dto.request.StartRollCallDTO;
import vn.edu.fpt.sba.intellicare.dto.response.RollCallSessionResponseDTO;
import vn.edu.fpt.sba.intellicare.entities.Staff;
import vn.edu.fpt.sba.intellicare.repositories.StaffRepository;
import vn.edu.fpt.sba.intellicare.services.IRollCallService;

import java.util.Map;

/**
 * Luồng "buổi cân điểm danh" - CHỈ Giáo viên (và Admin) mới dùng được.
 * Đây là API cho trình duyệt/app của giáo viên gọi (CÓ JWT) - khác hẳn
 * SchoolMeasurementController (API cho ESP32 gọi, KHÔNG có JWT).
 */
@RestController
@RequestMapping("/api/roll-call")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ROLE_TEACHER', 'ROLE_ADMIN')")
public class RollCallController {

    private final IRollCallService rollCallService;
    private final StaffRepository staffRepository;

    private Integer getCurrentTeacherId(Authentication authentication) {
        String username = authentication.getName();
        Staff staff = staffRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản giáo viên"));
        return staff.getStaffId();
    }

    @PostMapping("/start")
    public ResponseEntity<?> startRollCall(
            @RequestBody StartRollCallDTO request, Authentication authentication) {
        try {
            Integer teacherId = getCurrentTeacherId(authentication);
            RollCallSessionResponseDTO result = rollCallService.startRollCall(
                    request.classId(), teacherId, request.deviceId());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/start-weighing")
    public ResponseEntity<?> startWeighingCurrentStudent(@PathVariable Integer id) {
        try {
            return ResponseEntity.ok(rollCallService.startWeighingCurrentStudent(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<?> getStatus(@PathVariable Integer id) {
        try {
            return ResponseEntity.ok(rollCallService.getStatus(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/confirm-next")
    public ResponseEntity<?> confirmAndNext(@PathVariable Integer id) {
        try {
            return ResponseEntity.ok(rollCallService.confirmAndNext(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
