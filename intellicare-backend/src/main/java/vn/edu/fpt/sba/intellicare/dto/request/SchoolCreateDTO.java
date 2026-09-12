package vn.edu.fpt.sba.intellicare.dto.request;

import jakarta.validation.constraints.NotBlank;

public record SchoolCreateDTO(
        @NotBlank(message = "Tên trường không được để trống")
        String name,
        String address
) {}
