package vn.edu.fpt.sba.intellicare.controllers;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.sba.intellicare.dto.request.LoginRequestDTO;
import vn.edu.fpt.sba.intellicare.dto.request.RegisterRequestDTO;
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

    @PostMapping("/register")
    public ResponseEntity<?> registerPatient(@Valid @RequestBody RegisterRequestDTO request) {
        String phoneNumber = request.getPhoneNumber();
        String email = request.getEmail();

        // 1. KIỂM TRA BẮT BUỘC PHẢI CÓ SỐ ĐIỆN THOẠI
        if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Số điện thoại là thông tin bắt buộc!");
        }
        phoneNumber = phoneNumber.trim();
        boolean hasEmail = email != null && !email.trim().isEmpty();

        // 2. KIỂM TRA TRÙNG LẶP TRONG DATABASE
        if (patientRepository.findByPhoneNumber(phoneNumber).isPresent()) {
            return ResponseEntity.badRequest().body("Số điện thoại này đã được đăng ký tài khoản!");
        }
        if (hasEmail) {
            email = email.trim();
            if (patientRepository.findByEmail(email).isPresent()) {
                return ResponseEntity.badRequest().body("Email này đã được đăng ký tài khoản!");
            }
        }

        // 3. XÁC THỰC OTP NẾU NGƯỜI DÙNG CÓ NHẬP EMAIL
        if (hasEmail) {
            boolean isOtpValid = otpService.verifyOtp(email, request.getOtp());
            if (!isOtpValid) {
                return ResponseEntity.badRequest().body("Mã OTP Email không chính xác hoặc đã hết hạn!");
            }
        } 
        // LƯU Ý: Nếu không có Email, hệ thống ngầm hiểu Frontend đã xác thực SMS Firebase thành công.

        // 4. TẠO ĐỐI TƯỢNG PATIENT MỚI VÀ MAP DỮ LIỆU
        Patient patient = new Patient();
        patient.setFullName(request.getFullName());
        patient.setGender(request.getGender());
        patient.setDob(request.getDob());
        patient.setPhoneNumber(phoneNumber);
        
        if (hasEmail) {
            patient.setEmail(email);
        }

        // 5. MẬT KHẨU TỰ ĐỘNG CHÍNH LÀ SĐT (Mặc định cho dễ nhớ, đổi sau)
        String encodedPassword = passwordEncoder.encode(phoneNumber);
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
}