package vn.edu.fpt.sba.intellicare.services.impl;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import vn.edu.fpt.sba.intellicare.dto.response.MeasurementSessionResponseDTO;
import vn.edu.fpt.sba.intellicare.entities.Device;
import vn.edu.fpt.sba.intellicare.entities.MeasurementSession;
import vn.edu.fpt.sba.intellicare.entities.Patient;
import vn.edu.fpt.sba.intellicare.entities.WeightLog;
import vn.edu.fpt.sba.intellicare.enums.SessionStatus;
import vn.edu.fpt.sba.intellicare.repositories.DeviceRepository;
import vn.edu.fpt.sba.intellicare.repositories.MeasurementSessionRepository;
import vn.edu.fpt.sba.intellicare.repositories.PatientRepository;
import vn.edu.fpt.sba.intellicare.repositories.WeightLogRepository;
import vn.edu.fpt.sba.intellicare.services.IMeasurementSessionService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MeasurementSessionServiceImpl implements IMeasurementSessionService {

    private final MeasurementSessionRepository measurementSessionRepository;
    private final WeightLogRepository weightLogRepository;
    private final PatientRepository patientRepository;
    private final DeviceRepository deviceRepository;


    @Override
    public void initSession(Integer patientId, String deviceId) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bệnh nhân với ID: " + patientId));

        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thiết bị với ID: " + deviceId));

        MeasurementSession session = new MeasurementSession();
        session.setPatient(patient);
        session.setDevice(device);
        session.setStatus(SessionStatus.Pending);

        measurementSessionRepository.save(session);
    }

    @Override
    public void recordWeight(String deviceId, Double weightKg) {
        // CHỈ nhận dữ liệu cân cho session đã THỰC SỰ ở trạng thái Pending
        // (tức bệnh nhân đã bấm "Tiến hành cân"). Nếu session vẫn đang
        // AwaitingStart (chưa bấm nút), sẽ không tìm thấy gì ở đây -> ném
        // lỗi -> ESP32 tự bỏ qua/thử lại, không làm hỏng phiên đo thật.
        MeasurementSession session = measurementSessionRepository
                .findTopByDevice_DeviceIdAndStatusOrderByCreatedAtDesc(
                        deviceId,
                        SessionStatus.Pending)
                .orElseThrow(() -> new RuntimeException(
                        "Thiết bị " + deviceId + " chưa sẵn sàng nhận cân (chưa bấm Tiến hành cân hoặc phiên đã hết hạn)"));

        WeightLog log = new WeightLog();
        log.setPatient(session.getPatient());
        log.setDevice(session.getDevice());
        log.setWeightKg(weightKg);

        weightLogRepository.save(log);

        session.setStatus(SessionStatus.Completed);
        measurementSessionRepository.save(session);
    }

    @Override
    public MeasurementSessionResponseDTO getLatestSession(String deviceId) {
        MeasurementSession session = measurementSessionRepository
                .findTopByDevice_DeviceIdOrderByCreatedAtDesc(deviceId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phiên đo nào cho thiết bị: " + deviceId));

        Double weightResult = null;

        if (session.getStatus() == SessionStatus.Completed) {
            weightResult = weightLogRepository
                    .findTopByDevice_DeviceIdAndPatient_PatientIdOrderByLogIdDesc(
                            session.getDevice().getDeviceId(),
                            session.getPatient().getPatientId())
                    .map(WeightLog::getWeightKg)
                    .orElse(null);
        }

        return new MeasurementSessionResponseDTO(
                session.getSessionId(),
                session.getDevice().getDeviceId(),
                session.getDevice().getLocation(),
                session.getPatient().getPatientId(),
                session.getPatient().getFullName(),
                session.getStatus().name(),
                session.getCreatedAt(),
                weightResult);
    }

    @Override
    @Transactional
    public MeasurementSessionResponseDTO startSessionFromQr(String deviceId, String rawQrData) {
        String cleanData = rawQrData.trim();
        String[] parts = cleanData.split("\\s*\\|\\s*");

        if (parts.length < 7) {
            throw new IllegalArgumentException("Định dạng mã QR CCCD không hợp lệ. Độ dài: " + parts.length);
        }

        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseGet(() -> {
                    Device demoDevice = new Device();
                    demoDevice.setDeviceId(deviceId);
                    demoDevice.setLocation("Phòng Khám Demo POC");
                    demoDevice.setStatus("Active");
                    return deviceRepository.save(demoDevice);
                });

        if (!"Active".equalsIgnoreCase(device.getStatus())) {
            throw new IllegalStateException("Cân điện tử đang không hoạt động (Status: " + device.getStatus() + ")");
        }

        String idCard = parts[0];
        String fullName = parts[2];
        String dobStr = parts[3];
        String genderStr = parts[4];
        String address = parts[5];

        LocalDate dob = null;
        try {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("ddMMyyyy");
            dob = LocalDate.parse(dobStr, formatter);
        } catch (DateTimeParseException e) {
            System.err.println("Không thể parse ngày sinh: " + dobStr);
        }

        Optional<Patient> patientOpt = patientRepository.findByIdCard(idCard);
        Patient patient;

        if (patientOpt.isEmpty()) {
            patient = new Patient();
            patient.setPatientCode("PAT-" + idCard);
            patient.setIdCard(idCard);
            patient.setFullName(fullName);
            patient.setGender(genderStr);
            patient.setAddress(address);
            patient.setDob(dob);
            patient.setPassword("TEMP_PASSWORD");
            patient = patientRepository.save(patient);
        } else {
            patient = patientOpt.get();
        }

        MeasurementSession session = new MeasurementSession();
        session.setPatient(patient);
        session.setDevice(device);
        session.setStatus(SessionStatus.AwaitingStart);
        session = measurementSessionRepository.save(session);

        return new MeasurementSessionResponseDTO(
                session.getSessionId(),
                device.getDeviceId(),
                device.getLocation(),
                patient.getPatientId(),
                patient.getFullName(),
                session.getStatus().name(),
                LocalDateTime.now(),
                null);
    }

    @Override
    @Transactional
    public MeasurementSessionResponseDTO initSessionForExistingPatient(String deviceId, Patient patient) {
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Thiết bị không tồn tại: " + deviceId));

        MeasurementSession session = new MeasurementSession();
        session.setPatient(patient);
        session.setDevice(device);
        // Chờ bệnh nhân bấm "Tiến hành cân" ở màn xác nhận trước, KHÔNG cho
        // cân nhận dữ liệu ngay - tránh chốt nhầm phiên nếu ai đó lỡ chạm
        // cân trong lúc bệnh nhân còn đang đứng ở màn xác nhận danh tính.
        session.setStatus(SessionStatus.AwaitingStart);

        session = measurementSessionRepository.save(session);

        return new MeasurementSessionResponseDTO(
                session.getSessionId(),
                device.getDeviceId(),
                device.getLocation(),
                patient.getPatientId(),
                patient.getFullName(),
                session.getStatus().name(),
                LocalDateTime.now(),
                null);
    }

    @Override
    @Transactional
    public MeasurementSessionResponseDTO startWeighing(String deviceId) {
        // Tìm đúng phiên MỚI NHẤT đang chờ xác nhận (AwaitingStart) của
        // thiết bị này - đây là phiên bệnh nhân vừa quét CCCD, vừa bấm
        // "Tiến hành cân" ở màn xác nhận.
        MeasurementSession session = measurementSessionRepository
                .findTopByDevice_DeviceIdAndStatusOrderByCreatedAtDesc(
                        deviceId, SessionStatus.AwaitingStart)
                .orElseThrow(() -> new RuntimeException(
                        "Không tìm thấy phiên đang chờ xác nhận cho thiết bị: " + deviceId
                                + " (có thể đã quá hạn hoặc chưa quét CCCD)"));

        session.setStatus(SessionStatus.Pending);
        session = measurementSessionRepository.save(session);

        return new MeasurementSessionResponseDTO(
                session.getSessionId(),
                session.getDevice().getDeviceId(),
                session.getDevice().getLocation(),
                session.getPatient().getPatientId(),
                session.getPatient().getFullName(),
                session.getStatus().name(),
                session.getCreatedAt(),
                null);
    }
}
