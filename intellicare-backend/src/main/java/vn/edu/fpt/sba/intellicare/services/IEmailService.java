package vn.edu.fpt.sba.intellicare.services;

public interface IEmailService {
    void sendOtpEmail(String toEmail, String otpCode);
}
