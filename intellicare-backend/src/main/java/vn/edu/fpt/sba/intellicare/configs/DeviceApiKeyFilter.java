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
 * /api/measurements/** không có JWT (Kiosk và ESP32 đều không đăng nhập) -
 * trước đây "permitAll" hoàn toàn, ai cũng gọi được. Giờ yêu cầu thêm
 * header "X-Device-Key" khớp đúng giá trị bí mật đã cấu hình, để chặn bớt
 * request rác/spam từ internet (không phải bảo mật tuyệt đối vì key có
 * trong code Frontend/ESP32, nhưng đủ để lọc bot/scan tự động thông thường).
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

        if (request.getRequestURI().startsWith("/api/measurements/")) {
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
