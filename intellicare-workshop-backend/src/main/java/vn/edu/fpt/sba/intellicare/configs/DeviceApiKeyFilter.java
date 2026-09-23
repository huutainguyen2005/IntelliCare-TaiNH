package vn.edu.fpt.sba.intellicare.configs;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * ESP32 gọi /api/workshop/measurements/** không có JWT (không đăng nhập) -
 * yêu cầu header "X-Device-Key" khớp đúng giá trị bí mật đã cấu hình. Copy
 * đúng pattern từ intellicare-backend (DeviceApiKeyFilter.java).
 */
@Component
public class DeviceApiKeyFilter extends OncePerRequestFilter {

    @Value("${device.api.key}")
    private String expectedKey;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        // Bỏ qua CORS preflight - OPTIONS không mang dữ liệu thật,
        // Spring Security CORS handler sẽ xử lý headers riêng.
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        if (request.getRequestURI().startsWith("/api/workshop/measurements/")) {
            String provided = request.getHeader("X-Device-Key");

            if (provided == null || expectedKey == null || !expectedKey.equals(provided)) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write(
                        "{\"message\":\"Thiếu hoặc sai khóa xác thực thiết bị (X-Device-Key)\"}");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
