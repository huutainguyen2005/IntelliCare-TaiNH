package vn.edu.fpt.sba.intellicare.controllers;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.sba.intellicare.dto.request.StaffCreateDTO;
import vn.edu.fpt.sba.intellicare.dto.request.StaffUpdateDTO;
import vn.edu.fpt.sba.intellicare.dto.response.StaffResponseDTO;
import vn.edu.fpt.sba.intellicare.entities.Staff;
import vn.edu.fpt.sba.intellicare.enums.Role;
import vn.edu.fpt.sba.intellicare.repositories.StaffRepository;

import java.util.List;
import java.util.Map;

/**
 * Quản lý tài khoản Doctor/Nurse dành cho Admin.
 * TOÀN BỘ endpoint trong class này yêu cầu ROLE_ADMIN (áp ở mức class,
 * không cần lặp lại @PreAuthorize ở từng method).
 *
 * Không cho phép tạo/sửa/xóa tài khoản ADMIN qua API này, để tránh 1 Admin
 * vô tình (hoặc bị chiếm quyền) tạo thêm Admin khác/tự nâng quyền tài khoản
 * bất kỳ lên Admin qua đường vòng.
 */
@RestController
@RequestMapping("/api/staff")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class StaffController {

    private final StaffRepository staffRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    public ResponseEntity<List<StaffResponseDTO>> getAllStaff() {
        List<StaffResponseDTO> result = staffRepository.findAll().stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getStaffById(@PathVariable Integer id) {
        Staff staff = staffRepository.findById(id).orElse(null);
        if (staff == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Không tìm thấy nhân viên!"));
        }
        return ResponseEntity.ok(toDTO(staff));
    }

    @PostMapping
    public ResponseEntity<?> createStaff(@Valid @RequestBody StaffCreateDTO request) {
        if (request.role() == Role.ADMIN) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Không thể tạo tài khoản Admin qua chức năng này!"
            ));
        }

        if (staffRepository.findByUsername(request.username().trim()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Tên đăng nhập này đã tồn tại trong hệ thống!"
            ));
        }

        Staff staff = new Staff();
        staff.setUsername(request.username().trim());
        staff.setFullName(request.fullName().trim());
        staff.setRole(request.role());
        staff.setGender(request.gender());
        staff.setPassword(passwordEncoder.encode(request.password().trim()));

        if (request.email() != null && !request.email().isBlank()) {
            staff.setEmail(request.email().trim());
        }

        if (request.managerId() != null) {
            Staff manager = staffRepository.findById(request.managerId())
                    .orElse(null);
            staff.setManager(manager);
        }

        staff = staffRepository.save(staff);
        return ResponseEntity.ok(toDTO(staff));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateStaff(@PathVariable Integer id, @RequestBody StaffUpdateDTO request) {
        Staff staff = staffRepository.findById(id).orElse(null);
        if (staff == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Không tìm thấy nhân viên!"));
        }

        if (staff.getRole() == Role.ADMIN) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Không thể chỉnh sửa tài khoản Admin qua chức năng này!"
            ));
        }

        if (request.role() != null) {
            if (request.role() == Role.ADMIN) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Không thể đổi vai trò thành Admin!"
                ));
            }
            staff.setRole(request.role());
        }

        if (request.fullName() != null && !request.fullName().isBlank()) {
            staff.setFullName(request.fullName().trim());
        }

        if (request.gender() != null) {
            staff.setGender(request.gender());
        }

        if (request.email() != null) {
            staff.setEmail(request.email().isBlank() ? null : request.email().trim());
        }

        if (request.managerId() != null) {
            Staff manager = staffRepository.findById(request.managerId()).orElse(null);
            staff.setManager(manager);
        }

        if (request.password() != null && !request.password().isBlank()) {
            if (request.password().trim().length() < 6) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Mật khẩu mới phải có ít nhất 6 ký tự!"
                ));
            }
            staff.setPassword(passwordEncoder.encode(request.password().trim()));
        }

        staffRepository.save(staff);
        return ResponseEntity.ok(toDTO(staff));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteStaff(@PathVariable Integer id) {
        Staff staff = staffRepository.findById(id).orElse(null);
        if (staff == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Không tìm thấy nhân viên!"));
        }

        if (staff.getRole() == Role.ADMIN) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Không thể xóa tài khoản Admin!"
            ));
        }

        try {
            staffRepository.delete(staff);
        } catch (Exception e) {
            // Trường hợp nhân viên này đang là "manager" của nhân viên khác
            // (khóa ngoại manager_id) sẽ không xóa được, cần báo rõ lý do.
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Không thể xóa: nhân viên này đang quản lý người khác, hãy đổi người quản lý của họ trước!"
            ));
        }

        return ResponseEntity.ok(Map.of("message", "Đã xóa nhân viên thành công!"));
    }

    @PatchMapping("/{id}/toggle-active")
    public ResponseEntity<?> toggleActive(@PathVariable Integer id) {
        Staff staff = staffRepository.findById(id).orElse(null);
        if (staff == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Không tìm thấy nhân viên!"));
        }

        // Chặn cứng - KHÔNG BAO GIỜ được khóa tài khoản ADMIN, mất hết Admin
        // là không ai còn quyền quản lý hệ thống nữa.
        if (staff.getRole() == Role.ADMIN) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Không thể khóa tài khoản Admin!"
            ));
        }

        boolean newStatus = !Boolean.TRUE.equals(staff.getIsActive());
        staff.setIsActive(newStatus);
        staffRepository.save(staff);

        return ResponseEntity.ok(Map.of(
                "message", newStatus ? "Đã mở khóa tài khoản!" : "Đã khóa tài khoản!",
                "isActive", newStatus
        ));
    }

    private StaffResponseDTO toDTO(Staff s) {
        return new StaffResponseDTO(
                s.getStaffId(),
                s.getUsername(),
                s.getFullName(),
                s.getRole(),
                s.getManager() != null ? s.getManager().getStaffId() : null,
                s.getGender(),
                s.getEmail(),
                s.getIsActive()
        );
    }
}
