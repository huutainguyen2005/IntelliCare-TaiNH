package vn.edu.fpt.sba.intellicare.services.impl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import vn.edu.fpt.sba.intellicare.services.IEmailService;

@Service
public class EmailServiceImpl implements IEmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Override
    public void sendOtpEmail(String toEmail, String otpCode) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("cafemanagement1905@gmail.com");
        message.setTo(toEmail);
        message.setSubject("[INTELLICARE] - MÃ XÁC THỰC OTP CỦA BẠN");
        message.setText("Mã OTP của bạn là: " + otpCode);

        mailSender.send(message);
    }
}