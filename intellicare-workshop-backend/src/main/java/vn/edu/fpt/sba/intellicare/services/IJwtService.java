package vn.edu.fpt.sba.intellicare.services;

public interface IJwtService {
    String generateToken(String subject);
}
