package vn.edu.fpt.sba.intellicare.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record StudentCreateDTO(
        @NotBlank(message = "Họ tên không được để trống")
        String fullName,

        String dob, // format dd/MM/yyyy, co the null

        String gender,

        @NotNull(message = "Số thứ tự không được để trống")
        Integer indexNumber
) {}
