package vn.edu.fpt.sba.intellicare.services.impl;

import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.stereotype.Service;
import vn.edu.fpt.sba.intellicare.services.IXiaomiDecryptor;
import vn.edu.fpt.sba.intellicare.services.ScaleData;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.Security;
import java.util.Arrays;

/**
 * Giải mã MiBeacon v5 (AES-CCM) của Xiaomi Body Composition Scale S400
 * và parse object 0x6E16.
 * <p>
 * CẤU TRÚC OBJECT 0x6E16 (9 byte payload):
 * byte 0      : profile_id
 * byte 1..4   : uint32 LE  -> bitfield "data"
 * byte 5..8   : uint32 LE  -> unix timestamp
 * <p>
 * BITFIELD "data":
 * bit  0..10  (11 bit) : mass       -> weight_kg = mass / 10
 * bit 11..17  ( 7 bit) : hr_raw     -> bpm = hr_raw + 50   (0 hoac 127 = khong hop le)
 * bit 18..31  (14 bit) : impedance  -> ohm = impedance / 10
 * <p>
 * LUU Y: trong 1 lan do, can phat NHIEU frame khac nhau:
 * - frame "impedance-only" : mass == 0, chi co tro khang tan so thap
 * - frame "day du"         : mass != 0, co ca weight + bpm + impedance
 * Vi vay phai MERGE theo profile_id thay vi xu ly tung frame doc lap.
 */
@Service
public class XiaomiDecryptorImpl implements IXiaomiDecryptor {

    static {
        Security.addProvider(new BouncyCastleProvider());
    }

    private static final int OBJ_S400 = 0x6E16;

    /**
     * Trạng thái gộp frame cho 1 profile. Đổi sang Map<Integer,...> nếu
     * nhiều người dùng đo cùng lúc (workshop hiện chỉ 1 trạm cân).
     */
    private final ScaleData session = new ScaleData();

    // ------------------------------------------------------------------
    // 1. GIẢI MÃ
    // ------------------------------------------------------------------
    @Override
    public ScaleData decrypt(String rawHex, String macAddress, String bindKeyHex) throws Exception {
        byte[] raw = hexStringToByteArray(rawHex);
        if (raw.length < 5) throw new IllegalArgumentException("Frame qua ngan: " + raw.length);

        int frctrl = (raw[0] & 0xFF) | ((raw[1] & 0xFF) << 8);
        boolean isEncrypted = ((frctrl >> 3) & 1) != 0;
        boolean hasMac = ((frctrl >> 4) & 1) != 0;
        boolean hasCapability = ((frctrl >> 5) & 1) != 0;
        boolean hasObject = ((frctrl >> 6) & 1) != 0;

        if (!hasObject) return null; // frame idle, khong co du lieu

        int headerLen = 5;
        if (hasMac) headerLen += 6;
        if (hasCapability) {
            int capability = raw[headerLen] & 0xFF;
            headerLen += 1;
            if ((capability & 0x20) != 0) headerLen += 1; // IO capability
        }

        byte[] plaintext;
        if (!isEncrypted) {
            plaintext = Arrays.copyOfRange(raw, headerLen, raw.length);
        } else {
            final int tagLen = 4, counterLen = 3;
            int cipherLen = raw.length - headerLen - counterLen - tagLen;
            if (cipherLen <= 0) throw new IllegalArgumentException("Frame qua ngan de giai ma: " + raw.length);

            byte[] ciphertext = Arrays.copyOfRange(raw, headerLen, headerLen + cipherLen);
            byte[] extCounter = Arrays.copyOfRange(raw, headerLen + cipherLen, headerLen + cipherLen + counterLen);
            byte[] tag = Arrays.copyOfRange(raw, raw.length - tagLen, raw.length);

            byte[] macBytes = hasMac
                    ? reverse(Arrays.copyOfRange(raw, 5, 11))   // MAC nam trong frame, da dao nguoc
                    : reverse(macStringToByteArray(macAddress));

            byte[] nonce = new byte[12];
            System.arraycopy(macBytes, 0, nonce, 0, 6);
            nonce[6] = raw[2];
            nonce[7] = raw[3];
            nonce[8] = raw[4];
            System.arraycopy(extCounter, 0, nonce, 9, 3);

            byte[] fullCipher = new byte[ciphertext.length + tag.length];
            System.arraycopy(ciphertext, 0, fullCipher, 0, ciphertext.length);
            System.arraycopy(tag, 0, fullCipher, ciphertext.length, tag.length);

            Cipher cipher = Cipher.getInstance("AES/CCM/NoPadding", "BC");
            cipher.init(Cipher.DECRYPT_MODE,
                    new SecretKeySpec(hexStringToByteArray(bindKeyHex), "AES"),
                    new GCMParameterSpec(tagLen * 8, nonce));
            cipher.updateAAD(new byte[]{0x11});
            plaintext = cipher.doFinal(fullCipher);
        }

        System.out.println("PLAIN_HEX: " + bytesToHex(plaintext));
        return parseObjects(plaintext);
    }

    // ------------------------------------------------------------------
    // 2. DUYỆT TLV
    // ------------------------------------------------------------------
    private ScaleData parseObjects(byte[] p) {
        ScaleData last = null;
        int ptr = 0;
        while (ptr + 3 <= p.length) {
            int objId = (p[ptr] & 0xFF) | ((p[ptr + 1] & 0xFF) << 8);
            int objLen = p[ptr + 2] & 0xFF;
            int start = ptr + 3;
            if (start + objLen > p.length) break;

            if (objId == OBJ_S400 && objLen == 9) {
                last = parseS400(Arrays.copyOfRange(p, start, start + objLen));
            } else {
                System.out.printf("  [!] Object chua biet: id=0x%04X len=%d data=%s%n",
                        objId, objLen, bytesToHex(Arrays.copyOfRange(p, start, start + objLen)));
            }
            ptr = start + objLen;
        }
        return last;
    }

    // ------------------------------------------------------------------
    // 3. GIẢI BITFIELD + MERGE
    // ------------------------------------------------------------------
    private ScaleData parseS400(byte[] o) {
        int profileId = o[0] & 0xFF;
        long data = readU32LE(o, 1);
        long ts = readU32LE(o, 5);

        if (data == 0) return null; // frame rong

        int mass = (int) (data & 0x7FFL);
        int hrRaw = (int) ((data >>> 11) & 0x7FL);
        int impedance = (int) (data >>> 18);

        System.out.printf("  -> profile=%d data=0x%08X mass=%d hrRaw=%d imp=%d ts=%d%n",
                profileId, data, mass, hrRaw, impedance, ts);

        synchronized (session) {
            // Timestamp nhay xa => lan do moi, reset trang thai
            if (session.deviceTimestamp != null && Math.abs(ts - session.deviceTimestamp) > 60) {
                session.weightKg = null;
                session.heartRate = null;
                session.impedanceOhm = null;
                session.complete = false;
            }
            session.profileId = profileId;
            session.deviceTimestamp = ts;

            if (mass != 0) session.weightKg = mass / 10.0;
            if (hrRaw > 0 && hrRaw < 127) session.heartRate = hrRaw + 50;
            if (impedance != 0) {
                if (mass != 0) session.impedanceOhm = impedance / 10.0;
                else session.impedanceLowOhm = impedance / 10.0;
            }
            session.complete = session.weightKg != null
                    && (session.impedanceOhm != null || session.impedanceLowOhm != null);

            System.out.println("  => " + session);
            return copyOf(session);
        }
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------
    private static ScaleData copyOf(ScaleData s) {
        ScaleData d = new ScaleData();
        d.profileId = s.profileId;
        d.weightKg = s.weightKg;
        d.heartRate = s.heartRate;
        d.impedanceOhm = s.impedanceOhm;
        d.impedanceLowOhm = s.impedanceLowOhm;
        d.deviceTimestamp = s.deviceTimestamp;
        d.complete = s.complete;
        return d;
    }

    private static long readU32LE(byte[] b, int off) {
        return (b[off] & 0xFFL)
                | ((b[off + 1] & 0xFFL) << 8)
                | ((b[off + 2] & 0xFFL) << 16)
                | ((b[off + 3] & 0xFFL) << 24);
    }

    private static byte[] reverse(byte[] in) {
        byte[] out = new byte[in.length];
        for (int i = 0; i < in.length; i++) out[i] = in[in.length - 1 - i];
        return out;
    }

    private byte[] hexStringToByteArray(String s) {
        s = s.replace(" ", "").replace(":", "");
        byte[] data = new byte[s.length() / 2];
        for (int i = 0; i < s.length(); i += 2)
            data[i / 2] = (byte) ((Character.digit(s.charAt(i), 16) << 4) + Character.digit(s.charAt(i + 1), 16));
        return data;
    }

    private byte[] macStringToByteArray(String mac) {
        String[] hex = mac.split(":");
        byte[] b = new byte[6];
        for (int i = 0; i < 6; i++) b[i] = (byte) Integer.parseInt(hex[i], 16);
        return b;
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) sb.append(String.format("%02X", b));
        return sb.toString();
    }
}
