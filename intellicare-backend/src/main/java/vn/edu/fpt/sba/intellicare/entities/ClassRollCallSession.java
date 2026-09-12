package vn.edu.fpt.sba.intellicare.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import vn.edu.fpt.sba.intellicare.enums.RollCallStatus;

import java.time.LocalDateTime;

// 1 "buoi can" cua ca lop - giao vien bam "Bat dau buoi can" thi tao 1 dong
// o day, roi lan luot tung hoc sinh trong lop se co 1
// StudentMeasurementSession con gan voi buoi nay.
@Data
@NoArgsConstructor
@Table(name = "Class_Roll_Call_Sessions")
@Entity
public class ClassRollCallSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "session_id")
    private Integer sessionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    private SchoolClass schoolClass;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private Staff teacher;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, columnDefinition = "varchar(20)")
    private RollCallStatus status = RollCallStatus.InProgress;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
