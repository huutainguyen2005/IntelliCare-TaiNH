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
import vn.edu.fpt.sba.intellicare.enums.AccountStatus;
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

    @PostMapping("/staff/register")
    public ResponseEntity<?> registerStaff(@Valid @RequestBody StaffRegisterDTO request) {
        if (staffRepository.findByUsername(request.getUsername().trim()).isPresent()) {
            return ResponseEntity.badRequest().body("Tên đăng nhập này đã tồn tại trong hệ thống!");
        }

        Staff staff = new Staff();
        staff.setUsername(request.getUsername().trim());
        staff.setFullName(request.getFullName().trim());
        staff.setRole(request.getRole().trim().toUpperCase()); 

        String encodedPassword = passwordEncoder.encode(request.getPassword().trim());
        staff.setPassword(encodedPassword);

        staffRepository.save(staff);

        return ResponseEntity.ok(Map.of("message", "Tạo tài khoản Nhân viên y tế thành công!"));
    }

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

    @PostMapping("/patient/register")
    public ResponseEntity<?> registerPatient(@Valid @RequestBody PatientRegisterDTO request) {
        String phoneNumber = request.getPhoneNumber();
        String email = request.getEmail();

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

        if (hasEmail) {
            boolean isOtpValid = otpService.verifyOtp(email, request.getOtp());
            if (!isOtpValid) {
                return ResponseEntity.badRequest().body("Mã OTP Email không chính xác hoặc đã hết hạn!");
            }
        } 

        Patient patient = new Patient();
        patient.setFullName(request.getFullName());
        patient.setGender(request.getGender());
        patient.setDob(request.getDob());
        patient.setPhoneNumber(phoneNumber);
        patient.setIdCard(request.getIdCard()); 
        patient.setAddress(request.getAddress()); 
        patient.setPatientCode(generatePatientCode());
        
        if (hasEmail) {
            patient.setEmail(email);
        }

        // PHÂN LUỒNG KIOSK / WEB VỚI ENUM
        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            patient.setPassword(passwordEncoder.encode(request.getPassword().trim()));
            patient.setAccountStatus(AccountStatus.ACTIVE);
        } else {
            patient.setAccountStatus(AccountStatus.PENDING_PASSWORD);
        }

        patientRepository.save(patient);
        return ResponseEntity.ok(Map.of("message", "Đăng ký tài khoản bệnh nhân thành công!"));
    }

    @PostMapping("/patient/login")
    public ResponseEntity<?> loginPatient(@Valid @RequestBody LoginRequestDTO request) {
        String identifier = request.getIdentifier().trim();
        Patient patient;

        if (identifier.contains("@")) {
            patient = patientRepository.findByEmail(identifier)
                    .orElseThrow(() -> new RuntimeException("Sai tài khoản hoặc mật khẩu"));
        } else {
            patient = patientRepository.findByPhoneNumber(identifier)
                    .orElseThrow(() -> new RuntimeException("Sai tài khoản hoặc mật khẩu"));
        }

        // BẮT LỖI PENDING PASSWORD BẰNG ENUM
        if (patient.getAccountStatus() == AccountStatus.PENDING_PASSWORD) {
            return ResponseEntity.badRequest().body("Tài khoản chưa thiết lập mật khẩu. Vui lòng đăng nhập bằng mã OTP!");
        }

        if (!passwordEncoder.matches(request.getPassword(), patient.getPassword())) {
            throw new RuntimeException("Sai tài khoản hoặc mật khẩu");
        }

        String token = jwtService.generateToken(identifier, "ROLE_PATIENT");
        
        // TRUYỀN ENUM VÀO DTO
        return ResponseEntity.ok(new AuthResponseDTO(token, "PATIENT", patient.getFullName(), patient.getAccountStatus()));
    }

    @PostMapping("/patient/login-otp")
    public ResponseEntity<?> loginPatientOtp(@RequestBody Map<String, String> request) {
        String identifier = request.get("identifier");
        if (identifier == null || identifier.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Thiếu thông tin định danh!");
        }
        identifier = identifier.trim();
        
        Patient patient;
        if (identifier.contains("@")) {
            patient = patientRepository.findByEmail(identifier)
                    .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại!"));
            String otp = request.get("otp");
            if (!otpService.verifyOtp(identifier, otp)) {
                return ResponseEntity.badRequest().body("Mã OTP không hợp lệ hoặc đã hết hạn!");
            }
        } else {
            patient = patientRepository.findByPhoneNumber(identifier)
                    .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại!"));
        }

        String token = jwtService.generateToken(identifier, "ROLE_PATIENT");
        return ResponseEntity.ok(new AuthResponseDTO(token, "PATIENT", patient.getFullName(), patient.getAccountStatus()));
    }

    @PostMapping("/patient/set-password")
    public ResponseEntity<?> setPassword(@RequestBody Map<String, String> request) {
        String identifier = request.get("identifier");
        String newPassword = request.get("password");
        
        if (identifier == null || newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest().body("Thông tin không hợp lệ hoặc mật khẩu quá ngắn (>= 6 ký tự)!");
        }

        Patient patient;
        if (identifier.contains("@")) {
            patient = patientRepository.findByEmail(identifier).orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại!"));
        } else {
            patient = patientRepository.findByPhoneNumber(identifier).orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại!"));
        }
        
        patient.setPassword(passwordEncoder.encode(newPassword));
        patient.setAccountStatus(AccountStatus.ACTIVE); // CHUYỂN SANG ENUM ACTIVE
        patientRepository.save(patient);
        
        return ResponseEntity.ok(Map.of("message", "Thiết lập mật khẩu thành công!"));
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
        Integer maxId = patientRepository.findMaxPatientId();
        int nextId = maxId + 1;
        return String.format("BN%06d", nextId);
    }
}