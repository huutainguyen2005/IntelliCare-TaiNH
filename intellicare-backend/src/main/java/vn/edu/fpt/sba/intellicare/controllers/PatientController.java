package vn.edu.fpt.sba.intellicare.controllers;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.sba.intellicare.dto.request.PatientRegisterDTO;
import vn.edu.fpt.sba.intellicare.dto.request.PatientUpdateDTO;
import vn.edu.fpt.sba.intellicare.dto.response.PageResponseDTO;
import vn.edu.fpt.sba.intellicare.dto.response.PatientDetailResponseDTO;
import vn.edu.fpt.sba.intellicare.entities.Patient;
import vn.edu.fpt.sba.intellicare.services.IPatientService;

import java.util.List;
import java.util.Map;

/**
 * Quản lý bệnh nhân.
 * - XEM (list/detail/search): Admin, Doctor, Nurse đều được (Doctor/Nurse cần
 *   tra cứu hồ sơ để khám/theo dõi).
 * - SỬA/XÓA/KHÓA/TẠO: CHỈ Admin (method-level @PreAuthorize override lại
 *   class không có annotation chung, khai báo riêng từng method cho rõ ràng).
 */
@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
public class PatientController {

    private final IPatientService patientService;

    private static final String STAFF_ROLES =
            "hasAnyAuthority('ROLE_ADMIN','ROLE_DOCTOR','ROLE_NURSE')";

    @PreAuthorize(STAFF_ROLES)
    @GetMapping("")
    public PageResponseDTO<PatientDetailResponseDTO> patientList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<PatientDetailResponseDTO> pageRes = patientService.findAll(pageable);
        return PageResponseDTO.of(pageRes);
    }

    @PreAuthorize(STAFF_ROLES)
    @GetMapping("/{id}")
    public ResponseEntity<?> getPatientById(@PathVariable Integer id) {
        PatientDetailResponseDTO result = patientService.findById(id);
        if (result == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Không tìm thấy bệnh nhân!"));
        }
        return ResponseEntity.ok(result);
    }

    @PreAuthorize(STAFF_ROLES)
    @GetMapping("/search")
    public ResponseEntity<List<PatientDetailResponseDTO>> searchPatients(@RequestParam String keyword) {
        List<PatientDetailResponseDTO> result = patientService.searchPatientsByKeyword(keyword);
        return ResponseEntity.ok(result);
    }

    // ============ CHỈ ADMIN từ đây trở xuống ============

    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PostMapping("")
    public Patient createPatient(@Valid @RequestBody PatientRegisterDTO request) {
        return patientService.save(request);
    }

    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<?> updatePatient(
            @PathVariable Integer id, @RequestBody PatientUpdateDTO request) {
        PatientDetailResponseDTO updated = patientService.update(id, request);
        if (updated == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Không tìm thấy bệnh nhân!"));
        }
        return ResponseEntity.ok(updated);
    }

    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PatchMapping("/{id}/toggle-active")
    public ResponseEntity<?> toggleActive(@PathVariable Integer id) {
        PatientDetailResponseDTO updated = patientService.toggleActive(id);
        if (updated == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Không tìm thấy bệnh nhân!"));
        }
        return ResponseEntity.ok(Map.of(
                "message", Boolean.TRUE.equals(updated.isActive())
                        ? "Đã mở khóa hồ sơ bệnh nhân!" : "Đã khóa hồ sơ bệnh nhân!",
                "isActive", updated.isActive()
        ));
    }

    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePatient(@PathVariable Integer id) {
        try {
            patientService.delete(id);
            return ResponseEntity.ok(Map.of("message", "Đã xóa hồ sơ bệnh nhân thành công!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Không thể xóa: bệnh nhân này còn dữ liệu liên kết (lịch sử đo...)!"
            ));
        }
    }
}
