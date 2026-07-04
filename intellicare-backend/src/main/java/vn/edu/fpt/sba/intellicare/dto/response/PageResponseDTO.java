package vn.edu.fpt.sba.intellicare.dto.response;

import org.springframework.data.domain.Page;

import java.util.List;

// Generic type
public record PageResponseDTO<T> (
        List<T> content,
        int pageNumber,
        int size,
        long totalElements,
        int totalPages,
        boolean last) {

    public static <T> PageResponseDTO<T> of(Page<T> page) {
        return new PageResponseDTO<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isLast()
        );
    }
}