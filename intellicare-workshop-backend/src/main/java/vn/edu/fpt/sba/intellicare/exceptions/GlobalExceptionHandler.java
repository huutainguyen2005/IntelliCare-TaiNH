package vn.edu.fpt.sba.intellicare.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.Map;
import java.util.Objects;

/**
 * Trả lỗi dạng {"message": "..."} để frontend hiển thị được
 * (response mặc định của Spring không có field "message").
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** @Valid thất bại -> trả message của lỗi đầu tiên. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse("Dữ liệu không hợp lệ");
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }

    /** sessionId trên URL không phải UUID (VD link cũ /session/12) -> coi như không tồn tại. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, String>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", "Không tìm thấy phiên đo"));
    }
}