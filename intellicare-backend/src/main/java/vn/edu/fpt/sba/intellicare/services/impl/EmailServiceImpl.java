package vn.edu.fpt.sba.intellicare.services.impl;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import vn.edu.fpt.sba.intellicare.services.IEmailService;

@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements IEmailService {

    private final JavaMailSender mailSender;

    @Override
    public void sendOtpEmail(String toEmail, String otpCode) {
        try {
            // MimeMessage để hỗ trợ HTML
            MimeMessage message = mailSender.createMimeMessage();
            
            // Tham số 'true' cho phép gửi nội dung đa phương tiện (HTML)
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            // Cấu hình Sender Name 
            helper.setFrom("IntelliCare System <no-reply.intellicare.system@gmail.com>");
            helper.setTo(toEmail);
            helper.setSubject("[INTELLICARE] - MÃ XÁC THỰC OTP CỦA BẠN");

            String htmlContent = "<div style='font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ccfbf1; border-radius: 16px; max-width: 500px; margin: auto; background-color: #ffffff;'>"
                    + "<div style='text-align: center; margin-bottom: 20px;'>"
                    + "<h2 style='color: #0d9488; margin: 0; letter-spacing: 1px;'>INTELLICARE</h2>"
                    + "<p style='color: #64748b; font-size: 12px; margin-top: 5px;'>HỆ THỐNG QUẢN LÝ SỨC KHỎE THÔNG MINH</p>"
                    + "</div>"
                    + "<h3 style='color: #334155; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px;'>Xác Thực Tài Khoản</h3>"
                    + "<p style='color: #475569; font-size: 15px;'>Xin chào,</p>"
                    + "<p style='color: #475569; font-size: 15px;'>Bạn đang thực hiện đăng ký tài khoản trên hệ thống IntelliCare. Mã xác thực OTP của bạn là:</p>"
                    + "<div style='text-align: center; margin: 30px 0;'>"
                    + "<span style='font-size: 32px; font-weight: 800; color: #0d9488; letter-spacing: 8px; background: #f0fdfa; border: 2px solid #0d9488; padding: 15px 30px; border-radius: 12px; display: inline-block;'>" + otpCode + "</span>"
                    + "</div>"
                    + "<p style='color: #ef4444; font-size: 13px; font-weight: bold; text-align: center;'>Mã này có hiệu lực trong 5 phút. Vui lòng không chia sẻ cho bất kỳ ai.</p>"
                    + "</div>";

            // Set true để báo cho Spring Boot biết đây là HTML
            helper.setText(htmlContent, true);

            mailSender.send(message);
        } catch (MessagingException e) {
            // Ném lỗi RuntimeException để AuthController có thể bắt được và trả về HTTP 500
            throw new RuntimeException("Lỗi hệ thống khi thiết lập HTML Email: " + e.getMessage());
        }
    }
}