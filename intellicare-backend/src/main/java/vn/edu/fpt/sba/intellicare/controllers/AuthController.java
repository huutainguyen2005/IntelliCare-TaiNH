package vn.edu.fpt.sba.intellicare.controllers;

import jakarta.validation.Valid;
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
@RequestMapping("/auth") // Giữ nguyên gốc
public class AuthController {

    private final StaffRepository staffRepository;
    private final PatientRepository patientRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private IOtpService otpService;
    private IEmailService emailService;

    public AuthController(IEmailService emailService, IOtpService otpService, JwtService jwtService,
            PasswordEncoder passwordEncoder, PatientRepository patientRepository,
            StaffRepository staffRepository) {
        this.emailService = emailService;
        this.otpService = otpService;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.patientRepository = patientRepository;
        this.staffRepository = staffRepository;
    }

    // SỬA TẠI ĐÂY: Bỏ chữ /api/ bị thừa
    @PostMapping("/staff/login")
    public ResponseEntity<?> loginStaff(@Valid @RequestBody LoginRequestDTO request) {
        Staff staff = staffRepository.findByUsername(request.getIdentifier())
                .orElseThrow(() -> new RuntimeException("Sai tài khoản hoặc mật khẩu"));

        if (!passwordEncoder.matches(request.getPassword(), staff.getPassword())) {
            throw new RuntimeException("Sai tài khoản hoặc mật khẩu");
        }

        // SỬA TẠI ĐÂY: Ép chữ in hoa hoàn toàn cho Role (Ví dụ: "ROLE_DOCTOR",
        // "ROLE_NURSE")
        String staffRole = "ROLE_" + staff.getRole().trim().toUpperCase();

        String token = jwtService.generateToken(staff.getUsername(), staffRole);

        // Trả về cho Frontend chữ in hoa để dễ đồng bộ giao diện nếu cần
        return ResponseEntity.ok(new AuthResponseDTO(token, staff.getRole().toUpperCase(), staff.getFullName()));
    }

    @PostMapping("/patient/login")
    public ResponseEntity<?> loginPatient(@Valid @RequestBody LoginRequestDTO request) {
        String identifier = request.getIdentifier().trim();
        Patient patient;

        // Tự động nhận diện luồng đăng nhập bằng Email hay Số điện thoại
        if (identifier.contains("@")) {
            patient = patientRepository.findByEmail(identifier)
                    .orElseThrow(() -> new RuntimeException("Sai tài khoản hoặc mật khẩu"));
        } else {
            patient = patientRepository.findByPhoneNumber(identifier)
                    .orElseThrow(() -> new RuntimeException("Sai tài khoản hoặc mật khẩu"));
        }

        // Kiểm tra mật khẩu hệ thống
        if (!passwordEncoder.matches(request.getPassword(), patient.getPassword())) {
            throw new RuntimeException("Sai tài khoản hoặc mật khẩu");
        }

        // Dùng chính identifier (Email/SĐT) làm subject để JWT không bị Null khi giải
        // mã token sau này
        String token = jwtService.generateToken(identifier, "ROLE_PATIENT");

        return ResponseEntity.ok(new AuthResponseDTO(token, "PATIENT", patient.getFullName()));
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerPatient(@Valid @RequestBody RegisterRequestDTO request) {
        String identifier = request.getIdentifier().trim();

        // 1. XÁC THỰC OTP NẾU LÀ EMAIL
        if (identifier.contains("@")) {
            boolean isOtpValid = otpService.verifyOtp(identifier, request.getOtp());
            if (!isOtpValid) {
                return ResponseEntity.badRequest().body("Mã OTP Email không chính xác hoặc đã hết hạn!");
            }
        }
        // LƯU Ý: Nếu identifier là Số điện thoại, mã OTP đã được Firebase xác thực
        // thành công
        // ở phía Frontend rồi nên Backend có thể tin tưởng và bỏ qua bước check OTP của
        // RAM BE.

        // 2. KIỂM TRA TRÙNG LẶP TÀI KHOẢN TRONG DATABASE
        boolean isExist = identifier.contains("@")
                ? patientRepository.findByEmail(identifier).isPresent()
                : patientRepository.findByPhoneNumber(identifier).isPresent();

        if (isExist) {
            return ResponseEntity.badRequest().body("Số điện thoại hoặc Email này đã được đăng ký tài khoản!");
        }

        // 3. TẠO ĐỐI TƯỢNG PATIENT MỚI VÀ MAP DỮ LIỆU
        Patient patient = new Patient();
        patient.setFullName(request.getFullName());
        patient.setGender(request.getGender());
        patient.setDob(request.getDob());

        if (identifier.contains("@")) {
            patient.setEmail(identifier);
        } else {
            patient.setPhoneNumber(identifier);
        }

        // 4. MẬT KHẨU TỰ ĐỘNG CHÍNH LÀ SĐT HOẶC EMAIL VÀ ĐƯỢC MÃ HÓA BẢO MẬT
        String encodedPassword = passwordEncoder.encode(request.getIdentifier().trim());
        patient.setPassword(encodedPassword);

        // 5. LƯU XUỐNG DATABASE
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
            // 1. Sinh mã OTP 6 số ngẫu nhiên ứng với email này
            String otpCode = otpService.generateOtp(email);

            // 2. Bắn email thật đi qua Gmail SMTP
            emailService.sendOtpEmail(email, otpCode);

            return ResponseEntity.ok(Map.of("message", "Mã OTP đã được gửi thành công vào email của bạn."));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Lỗi hệ thống khi gửi Mail: " + e.getMessage());
        }
    }

    @GetMapping("/check-duplicate")
    public ResponseEntity<?> checkDuplicate(@RequestParam String identifier) {
        String cleanIdentifier = identifier.trim();

        // 1. Nếu là định dạng Email
        if (cleanIdentifier.contains("@")) {
            if (patientRepository.findByEmail(cleanIdentifier).isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT) // Mã 409 Conflict
                        .body("Email này đã được đăng ký trên hệ thống!");
            }
        }
        // 2. Nếu là định dạng Số điện thoại
        else {
            if (patientRepository.findByPhoneNumber(cleanIdentifier).isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT) // Mã 409 Conflict
                        .body("Số điện thoại này đã được đăng ký trên hệ thống!");
            }
        }

        // Nếu chưa tồn tại thì trả về OK để Frontend chạy tiếp
        return ResponseEntity.ok("Thông tin hợp lệ, có thể đăng ký.");
    }
}