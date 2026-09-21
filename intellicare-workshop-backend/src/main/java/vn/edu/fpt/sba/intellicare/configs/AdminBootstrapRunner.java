package vn.edu.fpt.sba.intellicare.configs;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import vn.edu.fpt.sba.intellicare.entities.WorkshopAdmin;
import vn.edu.fpt.sba.intellicare.repositories.WorkshopAdminRepository;

/**
 * Tự động tạo tài khoản Admin DUY NHẤT MỘT LẦN lúc khởi động, đọc từ biến
 * môi trường - KHÔNG BAO GIỜ hardcode username/password trong code hay
 * SQL script (thứ sẽ bị commit lên Git, kể cả khi push repo public thì
 * cũng không sao vì bản thân giá trị thật không hề nằm trong code).
 * <p>
 * Idempotent: nếu bảng workshop_admins ĐÃ có ít nhất 1 dòng, bỏ qua hoàn
 * toàn - tránh việc mỗi lần restart server lại reset đè mật khẩu Admin đã
 * đổi trước đó.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminBootstrapRunner implements CommandLineRunner {

    private final WorkshopAdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${workshop.admin.bootstrap-username:}")
    private String bootstrapUsername;

    @Value("${workshop.admin.bootstrap-password:}")
    private String bootstrapPassword;

    @Override
    public void run(String... args) {
        if (adminRepository.count() > 0) {
            log.info("Đã có tài khoản Admin trong DB - bỏ qua bước khởi tạo.");
            return;
        }

        if (bootstrapUsername.isBlank() || bootstrapPassword.isBlank()) {
            log.warn("CHƯA có tài khoản Admin nào, và thiếu ADMIN_BOOTSTRAP_USERNAME / "
                    + "ADMIN_BOOTSTRAP_PASSWORD trong biến môi trường - sẽ KHÔNG đăng "
                    + "nhập được cho tới khi bạn set 2 biến này rồi khởi động lại!");
            return;
        }

        WorkshopAdmin admin = WorkshopAdmin.builder()
                .username(bootstrapUsername.trim())
                .passwordHash(passwordEncoder.encode(bootstrapPassword))
                .build();
        adminRepository.save(admin);

        log.info("Đã tạo tài khoản Admin đầu tiên: {}", bootstrapUsername.trim());
    }
}
