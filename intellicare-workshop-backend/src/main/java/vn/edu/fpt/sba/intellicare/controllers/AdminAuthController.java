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
import vn.edu.fpt.sba.intellicare.dto.request.AdminLoginDTO;
import vn.edu.fpt.sba.intellicare.entities.WorkshopAdmin;
import vn.edu.fpt.sba.intellicare.repositories.WorkshopAdminRepository;
import vn.edu.fpt.sba.intellicare.services.IJwtService;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/auth/admin")
@RequiredArgsConstructor
public class AdminAuthController {

    private final WorkshopAdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final IJwtService jwtService;

    // Hash bcrypt - chống timing-attack
    private static final String DUMMY_BCRYPT_HASH =
            "$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5oOXPFBv/6bLLM2CN7Kt5j0.gYbXi";

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AdminLoginDTO request) {
        Optional<WorkshopAdmin> adminOpt = adminRepository.findByUsername(request.username().trim());
        WorkshopAdmin admin = adminOpt.orElse(null);

        String hashToCheck = (admin != null) ? admin.getPasswordHash() : DUMMY_BCRYPT_HASH;
        boolean passwordOk = passwordEncoder.matches(request.password(), hashToCheck);

        if (admin == null || !passwordOk) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Tài khoản hoặc mật khẩu không chính xác!"));
        }

        String token = jwtService.generateToken(admin.getUsername());
        return ResponseEntity.ok(Map.of("token", token, "username", admin.getUsername()));
    }
}