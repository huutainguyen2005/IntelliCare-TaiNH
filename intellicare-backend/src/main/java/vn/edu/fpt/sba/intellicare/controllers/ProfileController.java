package vn.edu.fpt.sba.intellicare.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.sba.intellicare.dto.response.UserProfileDTO;
import vn.edu.fpt.sba.intellicare.entities.Patient;
import vn.edu.fpt.sba.intellicare.entities.Staff;
import vn.edu.fpt.sba.intellicare.entities.WeightLog;
import vn.edu.fpt.sba.intellicare.repositories.PatientRepository;
import vn.edu.fpt.sba.intellicare.repositories.StaffRepository;

import java.util.Comparator;

@RestController
@RequestMapping("/profile")
public class ProfileController {

    private final PatientRepository patientRepository;
    private final StaffRepository staffRepository;

    public ProfileController(PatientRepository patientRepository, StaffRepository staffRepository) {
        this.patientRepository = patientRepository;
        this.staffRepository = staffRepository;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile(Authentication authentication) {
        String identifier = authentication.getName().trim();
        boolean isPatient = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equalsIgnoreCase("ROLE_PATIENT"));

        if (isPatient) {
            Patient patient = identifier.contains("@")
                    ? patientRepository.findByEmail(identifier).orElseThrow(() -> new RuntimeException("Không tìm thấy dữ liệu"))
                    : patientRepository.findByPhoneNumber(identifier).orElseThrow(() -> new RuntimeException("Không tìm thấy dữ liệu"));

            Double latestWeight = null;
            if (patient.getWeightLogs() != null && !patient.getWeightLogs().isEmpty()) {
                latestWeight = patient.getWeightLogs().stream()
                        .max(Comparator.comparing(WeightLog::getMeasuredAt))
                        .map(WeightLog::getWeightKg).orElse(null);
            }

            String displayEmail = (patient.getEmail() != null && !patient.getEmail().isEmpty()) ? patient.getEmail() : "patient@intellicare.vn";

            return ResponseEntity.ok(new UserProfileDTO(
                    patient.getPatientId(),    // <--- THAM SỐ 1: ID số chuẩn của Database
                    patient.getPhoneNumber(),  // THAM SỐ 2: Số điện thoại
                    patient.getFullName(),     // THAM SỐ 3
                    "ROLE_PATIENT",            // THAM SỐ 4
                    displayEmail,              // THAM SỐ 5
                    patient.getFaceImageUrl(), // THAM SỐ 6
                    latestWeight               // THAM SỐ 7
            ));
        } else {
            Staff staff = staffRepository.findByUsername(identifier)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy dữ liệu nhân viên"));

            return ResponseEntity.ok(new UserProfileDTO(
                    staff.getStaffId(),        // <--- ID số của Staff (hoặc null nếu không dùng đến)
                    staff.getUsername(),
                    staff.getFullName(),
                    staff.getRole(),
                    "staff@intellicare.vn",
                    null,
                    null
            ));
        }
    }
}