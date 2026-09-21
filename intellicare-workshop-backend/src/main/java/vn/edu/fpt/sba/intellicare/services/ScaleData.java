package vn.edu.fpt.sba.intellicare.services;

/**
 * Du lieu giai ma duoc tu 1 frame BLE cua can Xiaomi. Tach thanh class
 * rieng (khong con nam long trong XiaomiDecryptor nua) de IXiaomiDecryptor
 * (interface) khong phai "mang theo" 1 class du lieu ben trong no.
 */
public class ScaleData {
    public Integer profileId;
    public Double weightKg;        // null neu frame chua co can nang
    public Integer heartRate;      // null neu chua do xong nhip tim
    public Double impedanceOhm;    // tro khang khi co can nang (tan so cao)
    public Double impedanceLowOhm; // tro khang o frame chua co can nang
    public Long deviceTimestamp;   // unix seconds tu chinh cai can
    public boolean complete;       // true khi da du weight + impedance

    @Override
    public String toString() {
        return "ScaleData{profile=" + profileId
                + ", weight=" + weightKg
                + ", hr=" + heartRate
                + ", imp=" + impedanceOhm
                + ", impLow=" + impedanceLowOhm
                + ", ts=" + deviceTimestamp
                + ", complete=" + complete + "}";
    }
}
