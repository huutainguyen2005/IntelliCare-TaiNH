package vn.edu.fpt.sba.intellicare.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

// Nguoi dung ca nhan tu dang ky (Nhom 3 - khong thuoc benh vien/truong nao),
// TACH BIET hoan toan voi bang Patients (benh vien) - khong dung chung vi
// Patient co nhieu field rieng cho benh vien (CCCD, patient_code...) khong
// phu hop voi nguoi dung ca nhan.
@Data
@NoArgsConstructor
@Table(name = "Individual_Users")
@Entity
public class IndividualUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "individual_id")
    private Integer individualId;

    @Column(name = "full_name", length = 150, nullable = false)
    private String fullName;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(name = "email", length = 150)
    private String email;

    @Column(name = "password", nullable = false)
    private String password;

    @Column(name = "dob")
    private LocalDate dob;

    @Column(name = "gender", length = 20)
    private String gender;

    @Column(name = "is_active", columnDefinition = "bit not null default 1")
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
