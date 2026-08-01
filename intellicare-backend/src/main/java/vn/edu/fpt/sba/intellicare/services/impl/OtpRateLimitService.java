package vn.edu.fpt.sba.intellicare.services.impl;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class OtpRateLimitService {

    private static final int MAX_REQUESTS = 5;
    private static final long WINDOW_MINUTES = 15;
    private static final long COOLDOWN_SECONDS = 30;

    private final Cache<String, AtomicInteger> requestCountCache = Caffeine.newBuilder()
            .expireAfterWrite(WINDOW_MINUTES, TimeUnit.MINUTES)
            .maximumSize(10_000)
            .build();

    private final Cache<String, Long> lastRequestTimeCache = Caffeine.newBuilder()
            .expireAfterWrite(COOLDOWN_SECONDS, TimeUnit.SECONDS)
            .maximumSize(10_000)
            .build();

    private String normalize(String email) {
        return email.trim().toLowerCase();
    }

    /**
     * Kiểm tra + ghi nhận 1 lượt request OTP cho email này.
     * @return null nếu được phép gửi; ngược lại trả về message lỗi lý do bị chặn.
     */
    public String checkAndRecord(String email) {
        String key = normalize(email);

        if (lastRequestTimeCache.getIfPresent(key) != null) {
            return "Vui lòng đợi ít nhất " + COOLDOWN_SECONDS + " giây trước khi yêu cầu gửi lại OTP!";
        }

        AtomicInteger count = requestCountCache.asMap()
                .computeIfAbsent(key, k -> new AtomicInteger(0));

        if (count.get() >= MAX_REQUESTS) {
            return "Bạn đã yêu cầu gửi OTP quá nhiều lần. Vui lòng thử lại sau " + WINDOW_MINUTES + " phút!";
        }

        count.incrementAndGet();
        lastRequestTimeCache.put(key, System.currentTimeMillis());
        return null; // Cho phép gửi
    }
}
