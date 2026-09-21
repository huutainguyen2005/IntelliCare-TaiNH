package vn.edu.fpt.sba.intellicare.services.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import vn.edu.fpt.sba.intellicare.services.IWorkshopEmailService;

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
public class WorkshopEmailServiceImpl implements IWorkshopEmailService {

    @Value("${resend.api.key}")
    private String resendApiKey;

    @Value("${resend.from-email:onboarding@resend.dev}")
    private String fromEmail;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void sendResultEmail(String toEmail, String fullName, double weightKg,
                                double heightCm, double bmi) {
        Map<String, Object> payload = Map.of(
                "from", "IntelliCare Workshop <" + fromEmail + ">",
                "to", List.of(toEmail),
                "subject", "[INTELLICARE] Kết quả đo sức khỏe của bạn",
                "html", buildResultHtml(fullName, weightKg, heightCm, bmi)
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
                        "Lỗi gửi email kết quả (status " + response.statusCode() + "): " + response.body());
            }

            log.info("Đã gửi email kết quả tới: {}", toEmail);
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Lỗi hệ thống khi gửi Mail: " + e.getMessage());
        }
    }

    private String bmiLabel(double bmi) {
        if (bmi < 18.5) return "Thiếu cân";
        if (bmi < 23) return "Bình thường";
        if (bmi < 25) return "Thừa cân";
        return "Béo phì";
    }

    private String buildResultHtml(String fullName, double weightKg, double heightCm, double bmi) {
        return "<div style='font-family: Arial, sans-serif; padding: 24px; border: 1px solid #d8dad3; border-radius: 12px; max-width: 480px; margin: auto; background-color: #ffffff;'>"
                + "<div style='text-align: center; margin-bottom: 20px;'>"
                + "<h2 style='color: #12211A; margin: 0;'>INTELLICARE WORKSHOP</h2>"
                + "<p style='color: #6b7268; font-size: 12px; margin-top: 5px;'>KẾT QUẢ ĐO SỨC KHỎE</p>"
                + "</div>"
                + "<p style='color: #12211A; font-size: 15px;'>Xin chào <b>" + fullName + "</b>,</p>"
                + "<p style='color: #475569; font-size: 14px;'>Cảm ơn bạn đã tham gia trải nghiệm IntelliCare tại sự kiện. Dưới đây là kết quả đo của bạn:</p>"
                + "<table style='width: 100%; border-collapse: collapse; margin: 20px 0;'>"
                + row("Cân nặng", String.format("%.1f kg", weightKg))
                + row("Chiều cao", String.format("%.1f cm", heightCm))
                + row("Chỉ số BMI", String.format("%.1f (%s)", bmi, bmiLabel(bmi)))
                + "</table>"
                + "<p style='color: #9A3324; font-size: 12px;'>Lưu ý: đây là kết quả tham khảo tại sự kiện demo, không thay thế chẩn đoán y tế chuyên môn.</p>"
                + "</div>";
    }

    private String row(String label, String value) {
        return "<tr>"
                + "<td style='padding: 10px 0; border-bottom: 1px solid #d8dad3; color: #6b7268; font-size: 13px;'>" + label + "</td>"
                + "<td style='padding: 10px 0; border-bottom: 1px solid #d8dad3; color: #12211A; font-size: 15px; font-weight: 700; text-align: right;'>" + value + "</td>"
                + "</tr>";
    }
}
