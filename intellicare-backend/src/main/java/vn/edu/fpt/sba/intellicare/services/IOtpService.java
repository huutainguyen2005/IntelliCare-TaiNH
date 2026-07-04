package vn.edu.fpt.sba.intellicare.services;

public interface IOtpService {
    String generateOtp(String email);
    boolean verifyOtp(String email, String inputOtp);
}