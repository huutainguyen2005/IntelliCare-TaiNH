package vn.edu.fpt.sba.intellicare.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.sba.intellicare.utils.S400BodyComposition;
import vn.edu.fpt.sba.intellicare.utils.XiaomiDecryptor;

import java.util.HashMap;
import java.util.Map;

@RestController
@CrossOrigin("*")
public class XiaomiController {

   @Autowired
   private XiaomiDecryptor decryptor;

   private volatile XiaomiDecryptor.ScaleData latestData = new XiaomiDecryptor.ScaleData();
   private volatile S400BodyComposition.Result latestBody = null;

   private final String MAC = "34:fa:1c:3b:a7:13";
   // TODO: doi sang application.properties, dung commit bind key len git
   private final String BIND_KEY = "432852f411e81c89b30ae34b78b4e7d0";

   // --- HO SO NGUOI DUNG: sua cho khop voi profile trong app Xiaomi Home ---
   private static final S400BodyComposition.Sex USER_SEX = S400BodyComposition.Sex.MALE;
   private static final int USER_AGE = 21;
   private static final int USER_HEIGHT_CM = 160;

   @PostMapping("/api/sensor")
   public String receiveFromESP32(@RequestBody Map<String, String> payload) {
       String rawHex = payload.get("rawHex");
       if (rawHex == null || rawHex.isBlank()) return "EMPTY";

       try {
           XiaomiDecryptor.ScaleData decoded = decryptor.decrypt(rawHex, MAC, BIND_KEY);
           if (decoded == null) return "IGNORED";

           if (decoded.weightKg == null) {
               System.out.println("  (frame impedance-only, cho frame day du)");
               return "PARTIAL";
           }

           this.latestData = decoded;

           Double imp = effectiveImpedance(decoded);
           if (imp != null) {
               this.latestBody = S400BodyComposition.compute(
                       decoded.weightKg, imp, USER_SEX, USER_AGE, USER_HEIGHT_CM);
               System.out.printf("CAN NANG: %.1f kg | HR: %s | Imp: %.1f ohm | %s%n",
                       decoded.weightKg, decoded.heartRate, imp, latestBody);
           } else {
               System.out.printf("CAN NANG: %.1f kg | HR: %s | chua co tro khang%n",
                       decoded.weightKg, decoded.heartRate);
           }
           return "OK";

       } catch (Exception e) {
           e.printStackTrace();
           return "LOI GIAI MA";
       }
   }

//   @GetMapping("/api/latest")
//   public Map<String, Object> getLatestData() {
//       Map<String, Object> out = new HashMap<>();
//       XiaomiDecryptor.ScaleData d = this.latestData;
//       S400BodyComposition.Result b = this.latestBody;
//
//       out.put("weightKg", d.weightKg);
//       out.put("heartRate", d.heartRate);
//       out.put("impedanceOhm", effectiveImpedance(d));
//       out.put("deviceTimestamp", d.deviceTimestamp);
//       out.put("complete", d.complete);
//
//       if (b != null) {
//           out.put("fatPercent", b.fatPercent);
//           out.put("waterPercent", b.waterPercent);
//           out.put("muscleMassKg", b.muscleMassKg);
//           out.put("boneMassKg", b.boneMassKg);
//           out.put("visceralFat", b.visceralFat);
//           out.put("bmi", b.bmi);
//           out.put("bmrKcalDay", b.bmrKcalDay);
//       }
//       return out;
//   }
@GetMapping("/api/latest")
public Map<String, Object> getLatestData() {
    Map<String, Object> out = new HashMap<>();

    // ==========================================
    // DỮ LIỆU MÔ PHỎNG (MOCK DATA) ĐỂ TEST GIAO DIỆN
    // ==========================================
    out.put("weightKg", 68.5);                 // Cân nặng: 68.5 kg
    out.put("heartRate", 82);                  // Nhịp tim: 82 bpm
    out.put("impedanceOhm", 435.2);            // Trở kháng: 435.2 Ω
    out.put("deviceTimestamp", System.currentTimeMillis() / 1000); // Lấy giờ hiện tại của máy tính
    out.put("complete", true);                 // Trạng thái: Đã đo xong

    // Các chỉ số tính toán Body Composition
    out.put("fatPercent", 15.6);               // Tỉ lệ mỡ: 15.6%
    out.put("waterPercent", 61.2);             // Nước: 61.2%
    out.put("muscleMassKg", 54.3);             // Cơ: 54.3 kg
    out.put("boneMassKg", 2.8);                // Xương: 2.8 kg
    out.put("visceralFat", 6.5);               // Mỡ nội tạng: 6.5
    out.put("bmi", 22.4);                      // BMI: 22.4
    out.put("bmrKcalDay", 1650);               // BMR

    return out;
}

   /**
    * Uu tien tro khang tu frame day du, fallback sang frame impedance-only.
    */
   static Double effectiveImpedance(XiaomiDecryptor.ScaleData d) {
       return d.impedanceOhm != null ? d.impedanceOhm : d.impedanceLowOhm;
   }
}