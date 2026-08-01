package vn.edu.fpt.sba.intellicare.services.impl;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Chặn brute-force đăng nhập bằng cách đếm số lần sai liên tiếp theo
 * identifier (SĐT/email). Sau MAX_ATTEMPTS lần sai trong vòng
 * WINDOW_MINUTES phút, tài khoản bị khóa tạm thời khỏi việc đăng nhập.
 *
 * Nếu sau này scale lên nhiều instance, bộ đếm sẽ KHÔNG đồng bộ giữa các instance -> cần đổi
 * sang Redis để đếm tập trung.
 */
@Service
public class LoginAttemptService {

    private static final int MAX_ATTEMPTS = 5;
    private static final long WINDOW_MINUTES = 15;

    private final Cache<String, AtomicInteger> attemptsCache = Caffeine.newBuilder()
            .expireAfterWrite(WINDOW_MINUTES, TimeUnit.MINUTES)
            .maximumSize(10_000)
            .build();

    private String normalize(String identifier) {
        return identifier.trim().toLowerCase();
    }

    /** Gọi khi đăng nhập THẤT BẠI (sai mật khẩu hoặc không tìm thấy tài khoản) */
    public void recordFailedAttempt(String identifier) {
        attemptsCache.asMap()
                .computeIfAbsent(normalize(identifier), k -> new AtomicInteger(0))
                .incrementAndGet();
    }

    /** Gọi khi đăng nhập THÀNH CÔNG - xóa bộ đếm để không bị khóa lần sau */
    public void recordSuccess(String identifier) {
        attemptsCache.invalidate(normalize(identifier));
    }

    /** true nếu identifier này đang bị khóa tạm thời do sai quá nhiều lần */
    public boolean isBlocked(String identifier) {
        AtomicInteger count = attemptsCache.getIfPresent(normalize(identifier));
        return count != null && count.get() >= MAX_ATTEMPTS;
    }
}
