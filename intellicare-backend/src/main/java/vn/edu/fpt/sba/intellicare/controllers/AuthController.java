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
import vn.edu.fpt.sba.intellicare.services.impl.LoginAttemptService;

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
    private final LoginAttemptService loginAttemptService;

    // Hash "giả" dùng để chạy bcrypt.matches() khi không tìm thấy tài khoản,
    // giúp thời gian phản hồi ổn định, chống timing attack dò tài khoản.
    private static final String DUMMY_BCRYPT_HASH =
        "$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5oOXPFBv/6bLLM2CN7Kt5j0.gYbXi";

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
        String identifier = request.getIdentifier().trim();

        // CHẶN BRUTE-FORCE
        if (loginAttemptService.isBlocked(identifier)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                    "errorCode", "TOO_MANY_ATTEMPTS",
                    "message", "Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau ít phút."
            ));
        }

        Staff staff = staffRepository.findByUsername(identifier).orElse(null);

        // Dùng dummy hash nếu username không tồn tại
        // để tránh timing attack
        String hashToCheck = (staff != null)
                ? staff.getPassword()
                : DUMMY_BCRYPT_HASH;

        boolean passwordOk = passwordEncoder.matches(
                request.getPassword(),
                hashToCheck
        );

        // Không tìm thấy tài khoản hoặc sai mật khẩu
        if (staff == null || !passwordOk) {
            loginAttemptService.recordFailedAttempt(identifier);

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "errorCode", "INVALID_CREDENTIALS",
                    "message", "Tài khoản hoặc mật khẩu không chính xác!"
            ));
        }

        // Đăng nhập thành công -> reset số lần sai
        loginAttemptService.recordSuccess(identifier);

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

        // CHẶN BRUTE-FORCE: kiểm tra ngay từ đầu, trước khi làm bất kỳ việc gì khác
        if (loginAttemptService.isBlocked(identifier)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                    "errorCode", "TOO_MANY_ATTEMPTS",
                    "message", "Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau ít phút."
            ));
        }

        Patient patient = identifier.contains("@")
                ? patientRepository.findByEmail(identifier).orElse(null)
                : patientRepository.findByPhoneNumber(identifier).orElse(null);

        // TH1: Tài khoản tồn tại nhưng CHƯA kích hoạt -> báo rõ để hướng dẫn kích hoạt
        if (patient != null && patient.getAccountStatus() == AccountStatus.PENDING_PASSWORD) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "errorCode", "NOT_ACTIVATED",
                    "message", "Tài khoản chưa được kích hoạt. Vui lòng kích hoạt tài khoản trước khi đăng nhập!"
            ));
        }

        // TH2: Không tìm thấy TK hoặc sai mật khẩu -> GỘP CHUNG message, chống dò tài khoản.
        // Vẫn chạy passwordEncoder.matches() dù patient=null (dùng hash giả) để thời gian
        // phản hồi ổn định, chống timing attack.
        String hashToCheck = (patient != null) ? patient.getPassword() : DUMMY_BCRYPT_HASH;
        boolean passwordOk = passwordEncoder.matches(request.getPassword(), hashToCheck);

        if (patient == null || !passwordOk) {
            loginAttemptService.recordFailedAttempt(identifier); // GHI NHẬN LẦN SAI
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "errorCode", "INVALID_CREDENTIALS",
                    "message", "Tài khoản hoặc mật khẩu không chính xác!"
            ));
        }

        loginAttemptService.recordSuccess(identifier); // ĐĂNG NHẬP OK -> RESET BỘ ĐẾM
        String token = jwtService.generateToken(identifier, "ROLE_PATIENT");
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

    // API KIỂM TRA CCCD & NGÀY SINH (Bước 1 lúc Kích hoạt)
    @PostMapping("/patient/verify-activation")
    public ResponseEntity<?> verifyActivation(@RequestBody Map<String, String> request) {
        String idCard = request.get("idCard");
        String dobStr = request.get("dob");

        if (idCard == null || dobStr == null) {
            return ResponseEntity.badRequest().body("Vui lòng nhập đầy đủ CCCD và Ngày sinh!");
        }

        Patient patient = patientRepository.findByIdCard(idCard).orElse(null);
        if (patient == null) {
            return ResponseEntity.badRequest().body("Không tìm thấy hồ sơ y tế với số CCCD này. Bạn cần đo tại Kiosk trước!");
        }

        if (AccountStatus.ACTIVE.equals(patient.getAccountStatus())) {
            return ResponseEntity.badRequest().body("Tài khoản của bạn đã được kích hoạt. Vui lòng quay lại trang Đăng nhập!");
        }

        if (patient.getDob() == null || !patient.getDob().toString().equals(dobStr)) {
            return ResponseEntity.badRequest().body("Ngày sinh xác thực không chính xác!");
        }

        return ResponseEntity.ok(Map.of(
            "message", "Xác minh hợp lệ",
            "fullName", patient.getFullName(),
            "patientCode", patient.getPatientCode()
        ));
    }

    // API KÍCH HOẠT TÀI KHOẢN CHÍNH THỨC (Bước 2)
    @PostMapping("/patient/activate")
    public ResponseEntity<?> activatePatient(@Valid @RequestBody vn.edu.fpt.sba.intellicare.dto.request.PatientActivationRequestDTO request) {
        Patient patient = patientRepository.findByIdCard(request.getIdCard())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy hồ sơ bệnh nhân!"));

        if (AccountStatus.ACTIVE.equals(patient.getAccountStatus())) {
            return ResponseEntity.badRequest().body("Tài khoản đã được kích hoạt trước đó!");
        }

        // Kiểm tra xem SĐT thật này đã có ai dùng chưa
        java.util.Optional<Patient> existingPhone = patientRepository.findByPhoneNumber(request.getPhoneNumber().trim());
        if (existingPhone.isPresent() && !existingPhone.get().getPatientId().equals(patient.getPatientId())) {
            return ResponseEntity.badRequest().body("Số điện thoại này đã được sử dụng cho một hồ sơ khác!");
        }

        // Xác thực OTP (Nếu có Email thì kiểm tra OTP Email)
        String email = request.getEmail();
        boolean hasEmail = email != null && !email.trim().isEmpty();
        if (hasEmail) {
            if (!otpService.verifyOtp(email.trim(), request.getOtp())) {
                return ResponseEntity.badRequest().body("Mã OTP Email không chính xác hoặc đã hết hạn!");
            }
            patient.setEmail(email.trim());
        }

        // Ghi đè SĐT thật, gán mật khẩu và kích hoạt
        patient.setPhoneNumber(request.getPhoneNumber().trim());
        patient.setPassword(passwordEncoder.encode(request.getPassword().trim()));
        patient.setAccountStatus(AccountStatus.ACTIVE);
        
        patientRepository.save(patient);
        
        return ResponseEntity.ok(Map.of("message", "Kích hoạt tài khoản thành công! Bạn có thể đăng nhập ngay."));
    }

    private String generatePatientCode() {
        Integer maxId = patientRepository.findMaxPatientId();
        int nextId = maxId + 1;
        return String.format("BN%06d", nextId);
    }
}