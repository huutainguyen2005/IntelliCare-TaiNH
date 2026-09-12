package vn.edu.fpt.sba.intellicare.controllers;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.sba.intellicare.dto.request.IndividualWeightSubmitDTO;
import vn.edu.fpt.sba.intellicare.entities.IndividualUser;
import vn.edu.fpt.sba.intellicare.entities.IndividualWeightLog;
import vn.edu.fpt.sba.intellicare.repositories.IndividualUserRepository;
import vn.edu.fpt.sba.intellicare.repositories.IndividualWeightLogRepository;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Luong do can cho Nguoi dung ca nhan (Nhom 3). KHAC han Benh vien/Truong:
 * - Da dang nhap (JWT) truoc khi goi -> khong can Device API Key rieng
 * - KHONG dung state machine AwaitingStart->Pending->Completed - vi day la
 *   1 nguoi dung tu can tai nha rieng, khong co rui ro "nham nguoi dang
 *   dung tren can" nhu Kiosk cong cong (nhieu benh nhan) hay lop hoc
 *   (nhieu hoc sinh) - nen ghi nhan can nang truc tiep, khong can xac nhan
 *   qua nhieu buoc.
 */
@RestController
@RequestMapping("/api/individual-measurements")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_INDIVIDUAL')")
public class IndividualMeasurementController {

    private final IndividualUserRepository individualUserRepository;
    private final IndividualWeightLogRepository weightLogRepository;

    private IndividualUser getCurrentUser(Authentication authentication) {
        String identifier = authentication.getName().trim();
        Optional<IndividualUser> user = identifier.contains("@")
                ? individualUserRepository.findByEmail(identifier)
                : individualUserRepository.findByPhoneNumber(identifier);
        return user.orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản"));
    }

    @PostMapping("/submit")
    public ResponseEntity<?> submitWeight(
            @Valid @RequestBody IndividualWeightSubmitDTO request, Authentication authentication) {
        try {
            IndividualUser user = getCurrentUser(authentication);

            IndividualWeightLog log = new IndividualWeightLog();
            log.setIndividualUser(user);
            log.setWeightKg(request.weightKg());
            weightLogRepository.save(log);

            return ResponseEntity.ok(Map.of(
                    "message", "Ghi nhận cân nặng thành công",
                    "weightKg", log.getWeightKg()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/history")
    public ResponseEntity<?> getHistory(Authentication authentication) {
        try {
            IndividualUser user = getCurrentUser(authentication);
            List<vn.edu.fpt.sba.intellicare.dto.response.IndividualWeightLogResponseDTO> logs =
                    weightLogRepository
                            .findByIndividualUser_IndividualIdOrderByMeasuredAtDesc(user.getIndividualId())
                            .stream()
                            .map(log -> new vn.edu.fpt.sba.intellicare.dto.response.IndividualWeightLogResponseDTO(
                                    log.getLogId(), log.getWeightKg(), log.getMeasuredAt()))
                            .toList();
            return ResponseEntity.ok(logs);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
