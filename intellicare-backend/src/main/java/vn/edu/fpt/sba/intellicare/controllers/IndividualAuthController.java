package vn.edu.fpt.sba.intellicare.controllers;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.sba.intellicare.dto.request.IndividualLoginDTO;
import vn.edu.fpt.sba.intellicare.dto.request.IndividualRegisterDTO;
import vn.edu.fpt.sba.intellicare.entities.IndividualUser;
import vn.edu.fpt.sba.intellicare.repositories.IndividualUserRepository;
import vn.edu.fpt.sba.intellicare.services.impl.JwtService;
import vn.edu.fpt.sba.intellicare.services.impl.LoginAttemptService;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;

/**
 * Dang ky/Dang nhap cho Nguoi dung ca nhan (Nhom 3) - TACH BIET hoan toan
 * voi /auth/patient/** (Benh vien). Dung lai dung JwtService + pattern
 * chong timing-attack + rate limit y het AuthController.
 */
@RestController
@RequestMapping("/auth/individual")
@RequiredArgsConstructor
public class IndividualAuthController {

    private final IndividualUserRepository individualUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LoginAttemptService loginAttemptService;

    // Hash bcrypt "vo tri" - dung de chong timing-attack (doan duoc tai
    // khoan co ton tai hay khong qua thoi gian phan hoi). Xem giai thich
    // chi tiet trong AuthController.
    private static final String DUMMY_BCRYPT_HASH =
            "$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5oOXPFBv/6bLLM2CN7Kt5j0.gYbXi";

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody IndividualRegisterDTO request) {
        if ((request.phoneNumber() == null || request.phoneNumber().isBlank())
                && (request.email() == null || request.email().isBlank())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Cần ít nhất Số điện thoại hoặc Email"));
        }

        if (request.phoneNumber() != null && !request.phoneNumber().isBlank()
                && individualUserRepository.findByPhoneNumber(request.phoneNumber().trim()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Số điện thoại đã được sử dụng"));
        }
        if (request.email() != null && !request.email().isBlank()
                && individualUserRepository.findByEmail(request.email().trim()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email đã được sử dụng"));
        }

        IndividualUser user = new IndividualUser();
        user.setFullName(request.fullName().trim());
        user.setPhoneNumber(request.phoneNumber() != null ? request.phoneNumber().trim() : null);
        user.setEmail(request.email() != null ? request.email().trim() : null);
        user.setPassword(passwordEncoder.encode(request.password().trim()));
        user.setGender(request.gender());

        if (request.dob() != null && !request.dob().isBlank()) {
            try {
                user.setDob(LocalDate.parse(request.dob(), DateTimeFormatter.ofPattern("dd/MM/yyyy")));
            } catch (Exception ignored) {
            }
        }

        individualUserRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Đăng ký thành công! Vui lòng đăng nhập."));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody IndividualLoginDTO request) {
        String identifier = request.identifier().trim();

        if (loginAttemptService.isBlocked(identifier)) {
            long remainingSeconds = loginAttemptService.getRemainingLockSeconds(identifier);
            long remainingMinutes = (remainingSeconds + 59) / 60; // làm tròn lên
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                    "errorCode", "TOO_MANY_ATTEMPTS",
                    "message", "Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau khoảng " + remainingMinutes + " phút.",
                    "retryAfterSeconds", remainingSeconds
            ));
        }

        Optional<IndividualUser> userOpt = identifier.contains("@")
                ? individualUserRepository.findByEmail(identifier)
                : individualUserRepository.findByPhoneNumber(identifier);

        IndividualUser user = userOpt.orElse(null);

        if (user != null && Boolean.FALSE.equals(user.getIsActive())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "errorCode", "ACCOUNT_DISABLED",
                    "message", "Tài khoản đã bị khóa!"
            ));
        }

        String hashToCheck = (user != null) ? user.getPassword() : DUMMY_BCRYPT_HASH;
        boolean passwordOk = passwordEncoder.matches(request.password(), hashToCheck);

        if (user == null || !passwordOk) {
            loginAttemptService.recordFailedAttempt(identifier);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "errorCode", "INVALID_CREDENTIALS",
                    "message", "Tài khoản hoặc mật khẩu không chính xác!"
            ));
        }

        loginAttemptService.recordSuccess(identifier);

        String token = jwtService.generateToken(identifier, "ROLE_INDIVIDUAL");
        return ResponseEntity.ok(Map.of(
                "token", token,
                "role", "INDIVIDUAL",
                "fullName", user.getFullName()
        ));
    }
}