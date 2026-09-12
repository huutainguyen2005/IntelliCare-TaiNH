package vn.edu.fpt.sba.intellicare.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import vn.edu.fpt.sba.intellicare.enums.SessionStatus;

import java.time.LocalDateTime;

// Phien can cua TUNG hoc sinh trong 1 buoi diem danh (ClassRollCallSession).
// Dung lai dung state machine AwaitingStart -> Pending -> Completed y het
// ben Benh vien, de tranh chot nham hoc sinh khac dang dung tren can.
@Data
@NoArgsConstructor
@Table(name = "Student_Measurement_Sessions")
@Entity
public class StudentMeasurementSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "session_id")
    private Integer sessionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "roll_call_session_id", nullable = false)
    private ClassRollCallSession rollCallSession;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, columnDefinition = "varchar(20)")
    private SessionStatus status = SessionStatus.AwaitingStart;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
