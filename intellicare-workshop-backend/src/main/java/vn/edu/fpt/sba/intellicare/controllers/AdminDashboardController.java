package vn.edu.fpt.sba.intellicare.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.sba.intellicare.dto.response.CurrentMeasuringDTO;
import vn.edu.fpt.sba.intellicare.dto.response.DashboardStatsDTO;
import vn.edu.fpt.sba.intellicare.services.IWorkshopService;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/workshop/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminDashboardController {

    private final IWorkshopService workshopService;

    @GetMapping("/dashboard")
    public DashboardStatsDTO getDashboard() {
        return workshopService.getDashboardStats();
    }

    /** Ai đang đo trên cân? 204 No Content nếu trạm cân đang trống. */
    @GetMapping("/current-measuring")
    public ResponseEntity<CurrentMeasuringDTO> getCurrentMeasuring() {
        return workshopService.getCurrentMeasuring()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    /** Hủy lượt đo đang chờ để người sau đo ngay (thay vì đợi hết hạn). */
    @PostMapping("/sessions/{sessionId}/cancel")
    public ResponseEntity<Map<String, String>> cancelMeasuring(@PathVariable UUID sessionId) {
        try {
            workshopService.cancelMeasuring(sessionId);
            return ResponseEntity.ok(Map.of("message", "Đã hủy lượt đo"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/dashboard/details")
    public java.util.List<vn.edu.fpt.sba.intellicare.dto.response.ParticipantSessionDetailDTO> getDashboardDetails() {
        return workshopService.getDashboardDetails();
    }
}