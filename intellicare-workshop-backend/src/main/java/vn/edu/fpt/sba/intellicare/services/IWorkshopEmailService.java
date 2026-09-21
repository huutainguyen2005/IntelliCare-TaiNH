package vn.edu.fpt.sba.intellicare.services;

public interface IWorkshopEmailService {
    void sendResultEmail(String toEmail, String fullName, double weightKg,
                         double heightCm, double bmi);
}
