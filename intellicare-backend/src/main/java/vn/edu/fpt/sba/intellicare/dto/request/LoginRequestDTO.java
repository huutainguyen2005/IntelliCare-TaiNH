package vn.edu.fpt.sba.intellicare.dto.request;

public record LoginRequestDTO(
    String identifier,
    String password
) {}