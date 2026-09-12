package vn.edu.fpt.sba.intellicare.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Table(name = "Student_Weight_Logs")
@Entity
public class StudentWeightLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Integer logId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @Column(name = "weight_kg", nullable = false)
    private Double weightKg;

    @CreationTimestamp
    @Column(name = "measured_at", updatable = false)
    private LocalDateTime measuredAt;

    // CHUAN BI SAN CHO SAU NAY (do chieu cao cung luot can) - CHUA DUNG,
    // de comment de khong anh huong DB/API hien tai. Khi can dung: bo
    // comment.
    // @Column(name = "height_cm")
    // private Double heightCm;
    //
    // @Column(name = "bmi")
    // private Double bmi;
}
