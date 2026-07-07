package vn.edu.fpt.sba.intellicare.controllers;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import vn.edu.fpt.sba.intellicare.dto.request.LoginRequestDTO;
import vn.edu.fpt.sba.intellicare.dto.request.PatientRegisterDTO;
import vn.edu.fpt.sba.intellicare.dto.request.StaffRegisterDTO;
import vn.edu.fpt.sba.intellicare.dto.response.AuthResponseDTO;
import vn.edu.fpt.sba.intellicare.entities.Patient;
import vn.edu.fpt.sba.intellicare.entities.Staff;
import vn.edu.fpt.sba.intellicare.repositories.PatientRepository;
import vn.edu.fpt.sba.intellicare.repositories.StaffRepository;
import vn.edu.fpt.sba.intellicare.services.IEmailService;
import vn.edu.fpt.sba.intellicare.services.IOtpService;
import vn.edu.fpt.sba.intellicare.services.impl.JwtService;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final StaffRepository staffRepository;
    private final PatientRepository patientRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final IOtpService otpService;
    private final IEmailService emailService;

    @PostMapping("/staff/login")
    public ResponseEntity<?> loginStaff(@Valid @RequestBody LoginRequestDTO request) {
        Staff staff = staffRepository.findByUsername(request.getIdentifier())
                .orElseThrow(() -> new RuntimeException("Sai tài khoản hoặc mật khẩu"));

        if (!passwordEncoder.matches(request.getPassword(), staff.getPassword())) {
            throw new RuntimeException("Sai tài khoản hoặc mật khẩu");
        }

        String staffRole = "ROLE_" + staff.getRole().trim().toUpperCase();
        String token = jwtService.generateToken(staff.getUsername(), staffRole);

        return ResponseEntity.ok(new AuthResponseDTO(token, staff.getRole().toUpperCase(), staff.getFullName()));
    }

    @PostMapping("/patient/login")
    public ResponseEntity<?> loginPatient(@Valid @RequestBody LoginRequestDTO request) {
        // Đăng nhập vẫn giữ nguyên identifier vì bệnh nhân có thể dùng SĐT hoặc Email để login
        String identifier = request.getIdentifier().trim();
        Patient patient;

        if (identifier.contains("@")) {
            patient = patientRepository.findByEmail(identifier)
                    .orElseThrow(() -> new RuntimeException("Sai tài khoản hoặc mật khẩu"));
        } else {
            patient = patientRepository.findByPhoneNumber(identifier)
                    .orElseThrow(() -> new RuntimeException("Sai tài khoản hoặc mật khẩu"));
        }

        if (!passwordEncoder.matches(request.getPassword(), patient.getPassword())) {
            throw new RuntimeException("Sai tài khoản hoặc mật khẩu");
        }

        String token = jwtService.generateToken(identifier, "ROLE_PATIENT");
        return ResponseEntity.ok(new AuthResponseDTO(token, "PATIENT", patient.getFullName()));
    }

    @PostMapping("/staff/register")
    public ResponseEntity<?> registerStaff(@Valid @RequestBody StaffRegisterDTO request) {
        
        // 1. Kiểm tra trùng lặp Tên đăng nhập
        if (staffRepository.findByUsername(request.getUsername().trim()).isPresent()) {
            return ResponseEntity.badRequest().body("Tên đăng nhập này đã tồn tại trong hệ thống!");
        }

        // 2. Tạo đối tượng Staff mới
        Staff staff = new Staff();
        staff.setUsername(request.getUsername().trim());
        staff.setFullName(request.getFullName().trim());
        
        // Lưu role ở dạng in hoa để chuẩn hóa với Spring Security (VD: DOCTOR, NURSE)
        staff.setRole(request.getRole().trim().toUpperCase()); 

        // 3. Mã hóa mật khẩu
        String encodedPassword = passwordEncoder.encode(request.getPassword().trim());
        staff.setPassword(encodedPassword);

        // 4. Lưu xuống DB
        staffRepository.save(staff);

        return ResponseEntity.ok(Map.of("message", "Tạo tài khoản Nhân viên y tế thành công!"));
    }

    @PostMapping("/patient/register")
    public ResponseEntity<?> registerPatient(@Valid @RequestBody PatientRegisterDTO request) {
        String phoneNumber = request.getPhoneNumber();
        String email = request.getEmail();

        // 1. KIỂM TRA TRÙNG LẶP SĐT / EMAIL
        if (patientRepository.findByPhoneNumber(phoneNumber).isPresent()) {
            return ResponseEntity.badRequest().body("Số điện thoại này đã được đăng ký tài khoản!");
        }
        
        boolean hasEmail = email != null && !email.trim().isEmpty();
        if (hasEmail) {
            email = email.trim();
            if (patientRepository.findByEmail(email).isPresent()) {
                return ResponseEntity.badRequest().body("Email này đã được đăng ký tài khoản!");
            }
        }

        // 2. XÁC THỰC OTP NẾU NGƯỜI DÙNG CÓ NHẬP EMAIL
        if (hasEmail) {
            boolean isOtpValid = otpService.verifyOtp(email, request.getOtp());
            if (!isOtpValid) {
                return ResponseEntity.badRequest().body("Mã OTP Email không chính xác hoặc đã hết hạn!");
            }
        } 

        // 3. TẠO ĐỐI TƯỢNG PATIENT MỚI VÀ MAP DỮ LIỆU
        Patient patient = new Patient();
        patient.setFullName(request.getFullName());
        patient.setGender(request.getGender());
        patient.setDob(request.getDob());
        patient.setPhoneNumber(phoneNumber);
        patient.setFaceImageUrl(request.getFaceImageUrl());
        patient.setPatientCode(generatePatientCode());
        
        if (hasEmail) {
            patient.setEmail(email);
        }

        // 4. MẬT KHẨU (Sử dụng mật khẩu do người dùng nhập từ DTO)
        String encodedPassword = passwordEncoder.encode(request.getPassword().trim());
        patient.setPassword(encodedPassword);

        patientRepository.save(patient);

        return ResponseEntity.ok(Map.of("message", "Đăng ký tài khoản bệnh nhân thành công!"));
    }

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || !email.contains("@")) {
            return ResponseEntity.badRequest().body("Địa chỉ Email không hợp lệ!");
        }

        try {
            String otpCode = otpService.generateOtp(email);
            emailService.sendOtpEmail(email, otpCode);
            return ResponseEntity.ok(Map.of("message", "Mã OTP đã được gửi thành công vào email của bạn."));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Lỗi hệ thống khi gửi Mail: " + e.getMessage());
        }
    }

    @GetMapping("/check-duplicate")
    public ResponseEntity<?> checkDuplicate(@RequestParam(required = false) String phoneNumber, 
                                            @RequestParam(required = false) String email) {
        if (phoneNumber != null && !phoneNumber.trim().isEmpty()) {
            if (patientRepository.findByPhoneNumber(phoneNumber.trim()).isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body("Số điện thoại này đã được đăng ký trên hệ thống!");
            }
        }

        if (email != null && !email.trim().isEmpty()) {
            if (patientRepository.findByEmail(email.trim()).isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body("Email này đã được đăng ký trên hệ thống!");
            }
        }

        return ResponseEntity.ok("Thông tin hợp lệ, có thể đăng ký.");
    }

    private String generatePatientCode() {
        // Lấy ID lớn nhất hiện tại trong DB
        Integer maxId = patientRepository.findMaxPatientId();
        
        // Cộng thêm 1 cho người mới
        int nextId = maxId + 1;
        
        // Format chuỗi: "BN" + 6 chữ số (nếu thiếu thì độn số 0 vào trước)
        return String.format("BN%06d", nextId);
    }
}