package vn.edu.fpt.sba.intellicare.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ClassCreateDTO(
        @NotNull(message = "Mã trường không được để trống")
        Integer schoolId,

        @NotBlank(message = "Tên lớp không được để trống")
        String name
) {}
