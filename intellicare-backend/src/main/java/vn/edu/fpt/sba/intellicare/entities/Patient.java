package vn.edu.fpt.sba.intellicare.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import vn.edu.fpt.sba.intellicare.enums.AccountStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "Patients")
@Entity
public class Patient {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "patient_id")
    private Integer patientId;

    @Column(name = "patient_code", unique = true, nullable = false, length = 30)
    private String patientCode;

    @Column(name = "phone_number", unique = true, nullable = false, length = 20)
    private String phoneNumber;

    @Column(name = "email", length = 100) // Đã xóa unique=true như đã thống nhất
    private String email;

    @Column(name = "id_card", unique = true, length = 20)
    private String idCard;

    @Column(name = "address", columnDefinition = "NVARCHAR(255)")
    private String address;

    @Column(name = "password", length = 255) // Cột này mặc định đã cho phép NULL
    private String password;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "dob")
    private LocalDate dob;

    @Column(name="gender", nullable = true)
    private String gender;

    @Column(name = "face_image_url", columnDefinition = "NVARCHAR(MAX)")
    private String faceImageUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_status", length = 50)
    private AccountStatus accountStatus;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    // Mối quan hệ 1 bệnh nhân có nhiều lịch sử cân nặng
    @OneToMany(mappedBy = "patient", cascade = CascadeType.ALL)
    private List<WeightLog> weightLogs;

    // Mối quan hệ 1 bệnh nhân có nhiều phiên quét mã QR
    @OneToMany(mappedBy = "patient", cascade = CascadeType.ALL)
    private List<MeasurementSession> measurementSessions;
}