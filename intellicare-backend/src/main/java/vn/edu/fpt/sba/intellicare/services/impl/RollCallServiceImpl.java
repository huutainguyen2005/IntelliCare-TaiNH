package vn.edu.fpt.sba.intellicare.services.impl;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import vn.edu.fpt.sba.intellicare.dto.response.RollCallSessionResponseDTO;
import vn.edu.fpt.sba.intellicare.entities.*;
import vn.edu.fpt.sba.intellicare.enums.RollCallStatus;
import vn.edu.fpt.sba.intellicare.enums.SessionStatus;
import vn.edu.fpt.sba.intellicare.repositories.*;
import vn.edu.fpt.sba.intellicare.services.IRollCallService;

import java.util.List;
import java.util.Optional;

/**
 * Luồng "buổi cân điểm danh" của Trường mầm non - giáo viên chọn lớp, bấm
 * bắt đầu, hệ thống tự động lần lượt từng học sinh theo index_number:
 *
 *   startRollCall      -> tạo buổi, tự chọn học sinh ĐẦU TIÊN (AwaitingStart)
 *   startWeighingCurrent -> giáo viên xác nhận "sẵn sàng" (AwaitingStart -> Pending)
 *   recordWeight        -> ESP32 gửi cân nặng lên (Pending -> Completed)
 *   confirmAndNext       -> giáo viên xác nhận xong, tự chuyển em tiếp theo
 *
 * Dùng lại ĐÚNG state machine AwaitingStart -> Pending -> Completed đã có ở
 * luồng Bệnh viện, tránh chốt nhầm cân nặng cho học sinh khác đang đứng gần
 * cân trong lúc giáo viên chưa xác nhận xong.
 */
@Service
@RequiredArgsConstructor
public class RollCallServiceImpl implements IRollCallService {

    private final ClassRollCallSessionRepository rollCallRepo;
    private final StudentMeasurementSessionRepository studentSessionRepo;
    private final StudentRepository studentRepo;
    private final StudentWeightLogRepository weightLogRepo;
    private final DeviceRepository deviceRepo;
    private final SchoolClassRepository classRepo;
    private final StaffRepository staffRepo;

    @Transactional
    public RollCallSessionResponseDTO startRollCall(Integer classId, Integer teacherId, String deviceId) {
        SchoolClass schoolClass = classRepo.findById(classId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp học"));
        Staff teacher = staffRepo.findById(teacherId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy giáo viên"));
        Device device = deviceRepo.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thiết bị: " + deviceId));

        List<Student> students = studentRepo
                .findBySchoolClass_ClassIdOrderByIndexNumberAsc(classId);
        if (students.isEmpty()) {
            throw new RuntimeException("Lớp học chưa có học sinh nào, vui lòng thêm học sinh trước!");
        }

        ClassRollCallSession rollCall = new ClassRollCallSession();
        rollCall.setSchoolClass(schoolClass);
        rollCall.setTeacher(teacher);
        rollCall.setDevice(device);
        rollCall.setStatus(RollCallStatus.InProgress);
        rollCall = rollCallRepo.save(rollCall);

        Student first = students.get(0);
        StudentMeasurementSession session = createAwaitingSession(rollCall, first, device);

        return toDTO(rollCall, session);
    }

    @Transactional
    public RollCallSessionResponseDTO startWeighingCurrentStudent(Integer rollCallSessionId) {
        ClassRollCallSession rollCall = getRollCall(rollCallSessionId);
        StudentMeasurementSession current = getCurrentSession(rollCallSessionId);

        if (current.getStatus() != SessionStatus.AwaitingStart) {
            throw new RuntimeException("Học sinh hiện tại không ở trạng thái chờ xác nhận!");
        }
        current.setStatus(SessionStatus.Pending);
        studentSessionRepo.save(current);

        return toDTO(rollCall, current);
    }

    /** Gọi từ ESP32 - POST /api/school-measurements/submit */
    @Transactional
    public void recordWeight(String deviceId, Double weightKg) {
        StudentMeasurementSession session = studentSessionRepo
                .findTopByDevice_DeviceIdAndStatusOrderByCreatedAtDesc(deviceId, SessionStatus.Pending)
                .orElseThrow(() -> new RuntimeException(
                        "Thiết bị " + deviceId + " chưa sẵn sàng nhận cân (giáo viên chưa xác nhận hoặc phiên đã hết hạn)"));

        StudentWeightLog log = new StudentWeightLog();
        log.setStudent(session.getStudent());
        log.setDevice(session.getDevice());
        log.setWeightKg(weightKg);
        weightLogRepo.save(log);

        session.setStatus(SessionStatus.Completed);
        studentSessionRepo.save(session);
    }

    public RollCallSessionResponseDTO getStatus(Integer rollCallSessionId) {
        ClassRollCallSession rollCall = getRollCall(rollCallSessionId);
        StudentMeasurementSession current = getCurrentSession(rollCallSessionId);
        return toDTO(rollCall, current);
    }

    /** Giáo viên bấm "Xác nhận, học sinh tiếp theo" */
    @Transactional
    public RollCallSessionResponseDTO confirmAndNext(Integer rollCallSessionId) {
        ClassRollCallSession rollCall = getRollCall(rollCallSessionId);
        StudentMeasurementSession current = getCurrentSession(rollCallSessionId);

        if (current.getStatus() != SessionStatus.Completed) {
            throw new RuntimeException("Học sinh hiện tại chưa có kết quả cân, chưa thể chuyển tiếp!");
        }

        Integer classId = rollCall.getSchoolClass().getClassId();
        Integer currentIndex = current.getStudent().getIndexNumber();

        Optional<Student> next = studentRepo
                .findFirstBySchoolClass_ClassIdAndIndexNumberGreaterThanOrderByIndexNumberAsc(
                        classId, currentIndex);

        if (next.isEmpty()) {
            // Đã cân hết cả lớp - kết thúc buổi
            rollCall.setStatus(RollCallStatus.Completed);
            rollCallRepo.save(rollCall);
            return toDTO(rollCall, current);
        }

        StudentMeasurementSession nextSession = createAwaitingSession(rollCall, next.get(), rollCall.getDevice());
        return toDTO(rollCall, nextSession);
    }

    // ------------------------------------------------------------------

    private StudentMeasurementSession createAwaitingSession(
            ClassRollCallSession rollCall, Student student, Device device) {
        StudentMeasurementSession session = new StudentMeasurementSession();
        session.setRollCallSession(rollCall);
        session.setStudent(student);
        session.setDevice(device);
        session.setStatus(SessionStatus.AwaitingStart);
        return studentSessionRepo.save(session);
    }

    private ClassRollCallSession getRollCall(Integer id) {
        return rollCallRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy buổi điểm danh cân: " + id));
    }

    private StudentMeasurementSession getCurrentSession(Integer rollCallSessionId) {
        return studentSessionRepo
                .findTopByRollCallSession_SessionIdOrderByCreatedAtDesc(rollCallSessionId)
                .orElseThrow(() -> new RuntimeException("Buổi điểm danh chưa có học sinh nào được xếp cân"));
    }

    private RollCallSessionResponseDTO toDTO(ClassRollCallSession rollCall, StudentMeasurementSession current) {
        Double lastWeight = null;
        if (current.getStatus() == SessionStatus.Completed) {
            lastWeight = weightLogRepo
                    .findTopByDevice_DeviceIdAndStudent_StudentIdOrderByLogIdDesc(
                            current.getDevice().getDeviceId(), current.getStudent().getStudentId())
                    .map(StudentWeightLog::getWeightKg)
                    .orElse(null);
        }

        return new RollCallSessionResponseDTO(
                rollCall.getSessionId(),
                rollCall.getSchoolClass().getClassId(),
                rollCall.getSchoolClass().getName(),
                rollCall.getStatus().name(),
                current.getStudent().getStudentId(),
                current.getStudent().getFullName(),
                current.getStudent().getIndexNumber(),
                current.getStatus().name(),
                lastWeight
        );
    }
}
