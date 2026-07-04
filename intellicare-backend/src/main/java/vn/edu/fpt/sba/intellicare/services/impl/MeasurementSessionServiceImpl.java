package vn.edu.fpt.sba.intellicare.services.impl;

import jakarta.transaction.Transactional;
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
public class MeasurementSessionServiceImpl implements IMeasurementSessionService {
    private final MeasurementSessionRepository measurementSessionRepository;
    private final WeightLogRepository weightLogRepository;
    private final PatientRepository patientRepository;
    private final DeviceRepository deviceRepository;

    public MeasurementSessionServiceImpl(
            MeasurementSessionRepository measurementSessionRepository,
            WeightLogRepository weightLogRepository,
            PatientRepository patientRepository,
            DeviceRepository deviceRepository) {
        this.measurementSessionRepository = measurementSessionRepository;
        this.weightLogRepository = weightLogRepository;
        this.patientRepository = patientRepository;
        this.deviceRepository = deviceRepository;
    }

    @Override
    public void initSession(Integer patientId, String deviceId) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bệnh nhân với ID: " + patientId));

        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thiết bị với ID: " + deviceId));

        // 2. Tạo phiên mới và lưu
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
                        "Thiết bị " + deviceId + " chưa được quét QR hoặc phiên đã hết hạn"));

        // 2. Tạo Log cân nặng
        WeightLog log = new WeightLog();
        log.setPatient(session.getPatient());
        log.setDevice(session.getDevice());
        log.setWeightKg(weightKg);

        weightLogRepository.save(log);

        // 3. Đóng phiên
        session.setStatus(SessionStatus.Completed);
        measurementSessionRepository.save(session);
    }

    @Override
    public MeasurementSessionResponseDTO getLatestSession(String deviceId) {
        // 1. Tìm phiên làm việc mới nhất của cân này trong DB
        MeasurementSession session = measurementSessionRepository
                .findTopByDevice_DeviceIdOrderByCreatedAtDesc(deviceId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phiên đo nào cho thiết bị: " + deviceId));

        // 2. Mặc định cân nặng là null (nếu đang Pending)
        Double weightResult = null;

        // 3. Nếu phiên đã đo xong (Completed), móc vào bảng Weight_Logs lôi số ký ra
        if (session.getStatus() == vn.edu.fpt.sba.intellicare.enums.SessionStatus.Completed) {
            weightResult = weightLogRepository
                    .findTopByDevice_DeviceIdAndPatient_PatientIdOrderByLogIdDesc(
                            session.getDevice().getDeviceId(),
                            session.getPatient().getPatientId())
                    .map(WeightLog::getWeightKg)
                    .orElse(null);
        }

        // 4. Chuyển đổi từ Entity sang DTO để trả về cho Frontend
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
        // Làm sạch dữ liệu QR trước khi xử lý
        String cleanData = rawQrData.trim();
        String[] parts = cleanData.split("\\s*\\|\\s*");

        System.out.println("Số phần tử sau khi tách: " + parts.length);
        for (int i = 0; i < parts.length; i++) {
            System.out.println("Phần tử " + i + ": " + parts[i]);
        }

        System.out.println("DEBUG: Dữ liệu QR sau khi trim: " + cleanData);
        System.out.println("DEBUG: Số lượng phần tử tách được: " + parts.length);

        if (parts.length < 7) {
            throw new IllegalArgumentException("Định dạng mã QR CCCD không hợp lệ. Độ dài: " + parts.length);
        }

        // TỰ ĐỘNG TẠO THIẾT BỊ NẾU CHƯA CÓ
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

        // Tạo phiên đo
        MeasurementSession session = new MeasurementSession();
        session.setPatient(patient);
        session.setDevice(device);
        session.setStatus(SessionStatus.Pending);
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
        // Tìm thiết bị
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Thiết bị không tồn tại: " + deviceId));

        // Tạo phiên cân mới
        MeasurementSession session = new MeasurementSession();
        session.setPatient(patient);
        session.setDevice(device);
        session.setStatus(vn.edu.fpt.sba.intellicare.enums.SessionStatus.Pending);

        session = measurementSessionRepository.save(session);

        // Trả về DTO để Frontend hiển thị trạng thái chờ đo
        return new MeasurementSessionResponseDTO(
                session.getSessionId(),
                device.getDeviceId(),
                device.getLocation(),
                patient.getPatientId(),
                patient.getFullName(),
                session.getStatus().name(),
                java.time.LocalDateTime.now(),
                null);
    }
}