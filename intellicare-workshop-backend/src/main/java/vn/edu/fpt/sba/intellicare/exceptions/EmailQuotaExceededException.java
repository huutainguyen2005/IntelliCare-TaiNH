package vn.edu.fpt.sba.intellicare.exceptions;

/**
 * Resend báo đã hết hạn mức gửi email (gói free: 100 email/ngày, 3.000 email/tháng).
 * Khác lỗi thường: KHÔNG nên thử lại liên tục - phải chờ hạn mức hồi lại rồi gửi bù.
 */
public class EmailQuotaExceededException extends RuntimeException {
    public EmailQuotaExceededException(String message) {
        super(message);
    }
}