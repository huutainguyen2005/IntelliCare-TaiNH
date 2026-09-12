package vn.edu.fpt.sba.intellicare.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record IndividualWeightSubmitDTO(
        @NotNull(message = "Cân nặng không được để trống")
        @Positive(message = "Cân nặng phải lớn hơn 0")
        Double weightKg
) {}
