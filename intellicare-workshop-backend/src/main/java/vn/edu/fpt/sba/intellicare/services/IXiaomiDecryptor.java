package vn.edu.fpt.sba.intellicare.services;

public interface IXiaomiDecryptor {

    /**
     * Giải mã 1 frame BLE thô (MiBeacon v5, AES-CCM) từ cân Xiaomi Body
     * Composition Scale S400. Trả về null nếu frame không chứa dữ liệu
     * (frame "idle"), hoặc đối tượng {@link ScaleData} với các trường có
     * thể vẫn còn null (VD: weightKg null nếu đây là frame "impedance-only",
     * chưa đủ dữ liệu - cần đợi frame tiếp theo).
     */
    ScaleData decrypt(String rawHex, String macAddress, String bindKeyHex) throws Exception;

    /**
     * Xóa dữ liệu đã gộp từ các frame trước (cân nặng, trở kháng...). Gọi khi bắt đầu /
     * kết thúc 1 lần đo để cân nặng của người trước không "dính" sang người sau
     * (decryptor chỉ tự reset khi timestamp của cân nhảy quá 60 giây).
     */
    void reset();
}