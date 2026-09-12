package vn.edu.fpt.sba.intellicare.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Table(name = "Individual_Weight_Logs")
@Entity
public class IndividualWeightLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Integer logId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "individual_id", nullable = false)
    private IndividualUser individualUser;

    // Nullable - nguoi dung ca nhan co the dung can khong dang ky thiet bi
    // cu the (VD: nhap tay, hoac can chua gan device_id nao)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = true)
    private Device device;

    @Column(name = "weight_kg", nullable = false)
    private Double weightKg;

    @CreationTimestamp
    @Column(name = "measured_at", updatable = false)
    private LocalDateTime measuredAt;

    // ============================================================
    // DA CHUAN BI SAN CHO CAN BLE XIAOMI (Giai doan 3 trong lo trinh) -
    // CHUA DUNG, de comment de khong anh huong DB/API hien tai. Khi can
    // dung: bo comment + chay ALTER TABLE them cot tuong ung.
    // ============================================================
    // @Column(name = "height_cm")
    // private Double heightCm;
    //
    // @Column(name = "bmi")
    // private Double bmi;
    //
    // @Column(name = "heart_rate")
    // private Integer heartRate;
    //
    // @Column(name = "impedance_ohm")
    // private Double impedanceOhm;
    //
    // @Column(name = "body_fat_percent")
    // private Double bodyFatPercent;
    //
    // @Column(name = "water_percent")
    // private Double waterPercent;
    //
    // @Column(name = "muscle_mass_kg")
    // private Double muscleMassKg;
    //
    // @Column(name = "bone_mass_kg")
    // private Double boneMassKg;
    //
    // @Column(name = "visceral_fat")
    // private Double visceralFat;
    //
    // @Column(name = "bmr_kcal_day")
    // private Integer bmrKcalDay;
    //
    // @Column(name = "metabolic_age_years")
    // private Integer metabolicAgeYears;
}
