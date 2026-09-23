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
    private final vn.edu.fpt.sba.intellicare.utils.XiaomiDecryptor xiaomiDecryptor;

    // TODO: doi sang application.properties (giống XiaomiController)
    private final String MAC = "34:fa:1c:3b:a7:13";
    private final String BIND_KEY = "432852f411e81c89b30ae34b78b4e7d0";
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
    public void recordKioskData(String deviceId, String rawHex, Double heightCm) {
        // Tìm session Pending
        Optional<MeasurementSession> sessionOpt = measurementSessionRepository
                .findTopByDevice_DeviceIdAndStatusOrderByCreatedAtDesc(deviceId, SessionStatus.Pending);
        if (sessionOpt.isEmpty()) return; // Bỏ qua nếu ko có phiên Pending

        MeasurementSession session = sessionOpt.get();

        // 1. Cập nhật chiều cao liên tục nếu có
        if (heightCm != null && heightCm > 0) {
            session.setHeightCm(heightCm);
            measurementSessionRepository.save(session);
        }

        // 2. Xử lý BLE Cân Xiaomi
        if (rawHex != null && !rawHex.isBlank()) {
            try {
                vn.edu.fpt.sba.intellicare.utils.XiaomiDecryptor.ScaleData decoded = xiaomiDecryptor.decrypt(rawHex, MAC, BIND_KEY);
                if (decoded != null && decoded.weightKg != null) {
                    // Đã có cân nặng (kể cả chưa có trở kháng/chưa complete) -> Lưu weight và tính BMI
                    WeightLog log = new WeightLog();
                    log.setPatient(session.getPatient());
                    log.setDevice(session.getDevice());
                    log.setWeightKg(decoded.weightKg);
                    weightLogRepository.save(log);

                    if (session.getHeightCm() != null && session.getHeightCm() > 0) {
                        double heightM = session.getHeightCm() / 100.0;
                        double bmi = decoded.weightKg / (heightM * heightM);
                        session.setBmi(Math.round(bmi * 10.0) / 10.0);
                    }

                    session.setStatus(SessionStatus.Completed);
                    measurementSessionRepository.save(session);
                }
            } catch (Exception e) {
                System.err.println("Lỗi giải mã BLE Kiosk: " + e.getMessage());
            }
        }
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
                weightResult,
                session.getHeightCm(),
                session.getBmi());
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
                null, null, null);
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
                null, null, null);
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
                null, null, null);
    }
}
