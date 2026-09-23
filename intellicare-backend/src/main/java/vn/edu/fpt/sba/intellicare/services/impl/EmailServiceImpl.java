package vn.edu.fpt.sba.intellicare.services.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import vn.edu.fpt.sba.intellicare.services.IEmailService;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class EmailServiceImpl implements IEmailService {

    @Value("${resend.api.key}")
    private String resendApiKey;

    // Đổi thành email thuộc domain đã verify khi có, VD: "no-reply@yourdomain.com"
    @Value("${resend.from-email:onboarding@resend.dev}")
    private String fromEmail;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void sendOtpEmail(String toEmail, String otpCode) {
        String htmlContent = buildOtpHtml(otpCode);

        Map<String, Object> payload = Map.of(
                "from", "IntelliCare System <" + fromEmail + ">",
                "to", List.of(toEmail),
                "subject", "[INTELLICARE] - MÃ XÁC THỰC OTP CỦA BẠN",
                "html", htmlContent
        );

        try {
            String jsonBody = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.resend.com/emails"))
                    .timeout(Duration.ofSeconds(10))
                    .header("Authorization", "Bearer " + resendApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 400) {
                log.error("Resend API lỗi [{}]: {}", response.statusCode(), response.body());
                throw new RuntimeException(
                        "Lỗi hệ thống khi gửi Mail qua Resend (status " + response.statusCode() + "): "
                                + response.body()
                );
            }

            log.info("Đã gửi OTP email qua Resend tới: {}", toEmail);
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Lỗi hệ thống khi gửi Mail: " + e.getMessage());
        }
    }

    private String buildOtpHtml(String otpCode) {
        return "<div style='font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ccfbf1; border-radius: 16px; max-width: 500px; margin: auto; background-color: #ffffff;'>"
                + "<div style='text-align: center; margin-bottom: 20px;'>"
                + "<h2 style='color: #0d9488; margin: 0; letter-spacing: 1px;'>INTELLICARE</h2>"
                + "<p style='color: #64748b; font-size: 12px; margin-top: 5px;'>HỆ THỐNG QUẢN LÝ SỨC KHỎE THÔNG MINH</p>"
                + "</div>"
                + "<h3 style='color: #334155; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px;'>Xác Thực Tài Khoản</h3>"
                + "<p style='color: #475569; font-size: 15px;'>Xin chào,</p>"
                + "<p style='color: #475569; font-size: 15px;'>Bạn đang thực hiện đăng ký/khôi phục tài khoản trên hệ thống IntelliCare. Mã xác thực OTP của bạn là:</p>"
                + "<div style='text-align: center; margin: 30px 0;'>"
                + "<span style='font-size: 32px; font-weight: 800; color: #0d9488; letter-spacing: 8px; background: #f0fdfa; border: 2px solid #0d9488; padding: 15px 30px; border-radius: 12px; display: inline-block;'>"
                + otpCode + "</span>"
                + "</div>"
                + "<p style='color: #ef4444; font-size: 13px; font-weight: bold; text-align: center;'>Mã này có hiệu lực trong 5 phút. Vui lòng không chia sẻ cho bất kỳ ai.</p>"
                + "</div>";
    }
}
