package vn.edu.fpt.sba.intellicare.configs;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Giới hạn số request theo IP (cửa sổ cố định, lưu trong RAM - đủ cho 1 instance):
 *   - POST /auth/admin/login     : chống dò mật khẩu admin (mặc định 5 lần / 60s)
 *   - POST /api/workshop/register : chống spam đăng ký (mặc định 60 lần / 60s)
 * <p>
 * register để rộng vì cả hội trường dùng chung 1 Wi-Fi => cùng 1 IP public (NAT).
 * <p>
 * Lấy IP thật: Render có Cloudflare đứng trước và X-Forwarded-For có thể bị giả mạo,
 * nên ưu tiên header True-Client-IP / CF-Connecting-IP do Cloudflare đặt.
 * Nếu đổi sang host KHÔNG có Cloudflare, set RATE_LIMIT_TRUST_CDN_IP_HEADERS=false
 * (nếu không client có thể tự đặt header để né giới hạn).
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final String LOGIN_PATH = "/auth/admin/login";
    private static final String REGISTER_PATH = "/api/workshop/register";
    private static final int MAX_TRACKED_KEYS = 100_000; // van an toàn chống phình RAM

    private record Window(long start, int count) {}

    @Value("${rate-limit.login.max-requests:5}")
    private int loginMax;

    @Value("${rate-limit.register.max-requests:60}")
    private int registerMax;

    @Value("${rate-limit.window-seconds:60}")
    private long windowSeconds;

    @Value("${rate-limit.trust-cdn-ip-headers:true}")
    private boolean trustCdnIpHeaders;

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private volatile long lastCleanupMillis = System.currentTimeMillis();

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        int limit;
        if (LOGIN_PATH.equals(path)) {
            limit = loginMax;
        } else if (REGISTER_PATH.equals(path)) {
            limit = registerMax;
        } else {
            filterChain.doFilter(request, response);
            return;
        }

        long now = System.currentTimeMillis();
        long windowMillis = windowSeconds * 1000L;
        cleanup(now, windowMillis);

        String key = path + "|" + resolveClientIp(request);
        Window window = windows.compute(key, (k, current) ->
                (current == null || now - current.start() >= windowMillis)
                        ? new Window(now, 1)
                        : new Window(current.start(), current.count() + 1));

        if (window.count() > limit) {
            long retryAfter = Math.max(1L, (window.start() + windowMillis - now + 999L) / 1000L);
            response.setStatus(429);
            response.setHeader("Retry-After", String.valueOf(retryAfter));
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(
                    "{\"message\":\"Bạn thao tác quá nhanh, vui lòng thử lại sau " + retryAfter + " giây.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String resolveClientIp(HttpServletRequest request) {
        String ip = null;
        if (trustCdnIpHeaders) {
            for (String header : new String[]{"True-Client-IP", "CF-Connecting-IP"}) {
                String value = request.getHeader(header);
                if (value != null && !value.isBlank()) {
                    ip = value.trim();
                    break;
                }
            }
        }
        if (ip == null) {
            ip = request.getRemoteAddr();
        }
        return ip.length() > 64 ? ip.substring(0, 64) : ip;
    }

    private void cleanup(long now, long windowMillis) {
        if (now - lastCleanupMillis < windowMillis && windows.size() < MAX_TRACKED_KEYS) {
            return;
        }
        lastCleanupMillis = now;
        windows.entrySet().removeIf(e -> now - e.getValue().start() >= windowMillis);
        if (windows.size() >= MAX_TRACKED_KEYS) {
            windows.clear();
        }
    }
}