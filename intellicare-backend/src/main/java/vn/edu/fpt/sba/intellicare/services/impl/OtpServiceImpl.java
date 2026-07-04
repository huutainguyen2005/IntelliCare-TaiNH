package vn.edu.fpt.sba.intellicare.services.impl;

import vn.edu.fpt.sba.intellicare.services.IOtpService;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpServiceImpl implements IOtpService {

    // Lớp nội bộ để giữ mã OTP và thời gian hết hạn
    private static class OtpCache {
        String code;
        LocalDateTime expiryTime;

        OtpCache(String code, LocalDateTime expiryTime) {
            this.code = code;
            this.expiryTime = expiryTime;
        }
    }

    // Dùng bộ nhớ RAM tạm thời (ConcurrentHashMap) để lưu: Key = Email -> Value = OtpCache
    private final Map<String, OtpCache> otpMap = new ConcurrentHashMap<>();

    @Override
    public String generateOtp(String email) {
        // Sinh mã ngẫu nhiên 6 chữ số từ 000000 - 999999
        String otpCode = String.format("%06d", new Random().nextInt(999999));
        // Đặt thời gian hết hạn là 5 phút tính từ hiện tại
        LocalDateTime expiryTime = LocalDateTime.now().plusMinutes(5);

        otpMap.put(email, new OtpCache(otpCode, expiryTime));
        return otpCode;
    }

    @Override
    public boolean verifyOtp(String email, String inputOtp) {
        OtpCache cache = otpMap.get(email);

        if (cache == null) return false; // Không tìm thấy yêu cầu OTP nào cho email này

        // Kiểm tra xem OTP đã hết hạn chưa
        if (LocalDateTime.now().isAfter(cache.expiryTime)) {
            otpMap.remove(email); // Xóa mã hết hạn khỏi RAM
            return false;
        }

        // So khớp mã người dùng nhập vào
        boolean isValid = cache.code.equals(inputOtp);
        if (isValid) {
            otpMap.remove(email); // Đúng mã thì xóa luôn khỏi bộ nhớ để tránh dùng lại
        }
        return isValid;
    }
}