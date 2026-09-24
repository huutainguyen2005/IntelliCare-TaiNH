package vn.edu.fpt.sba.intellicare.services.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.sba.intellicare.dto.request.RegisterParticipantDTO;
import vn.edu.fpt.sba.intellicare.dto.response.WorkshopSessionResponseDTO;
import vn.edu.fpt.sba.intellicare.dto.response.DashboardStatsDTO;
import vn.edu.fpt.sba.intellicare.entities.WorkshopParticipant;
import vn.edu.fpt.sba.intellicare.entities.WorkshopSession;
import vn.edu.fpt.sba.intellicare.enums.WorkshopSessionStatus;
import vn.edu.fpt.sba.intellicare.mapper.WorkshopSessionMapper;
import vn.edu.fpt.sba.intellicare.repositories.WorkshopParticipantRepository;
import vn.edu.fpt.sba.intellicare.repositories.WorkshopSessionRepository;
import vn.edu.fpt.sba.intellicare.services.IWorkshopEmailService;
import vn.edu.fpt.sba.intellicare.services.IWorkshopService;
import vn.edu.fpt.sba.intellicare.services.IXiaomiDecryptor;
import vn.edu.fpt.sba.intellicare.services.ScaleData;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkshopServiceImpl implements IWorkshopService {

    private final WorkshopParticipantRepository participantRepository;
    private final WorkshopSessionRepository sessionRepository;
    private final WorkshopSessionMapper sessionMapper;
    private final IXiaomiDecryptor xiaomiDecryptor;
    private final IWorkshopEmailService emailService;

    @Value("${xiaomi.scale.mac}")
    private String scaleMac;

    @Value("${xiaomi.scale.bind-key}")
    private String scaleBindKey;

    /**
     * Cho phép bypass giải mã BLE khi chưa có cân thật — CHỈ bật lúc test
     * bằng Swagger. Set MOCK_BYPASS_ENABLED=false TRƯỚC ngày sự kiện.
     */
    @Value("${mock.bypass.enabled:false}")
    private boolean mockBypassEnabled;

    /**
     * Bước 1 - Sinh viên quét QR ở standee, điền Họ tên + Email trên điện
     * thoại của chính mình -> tạo participant + session (AwaitingStart).
     * Dùng Builder pattern để dựng entity (rõ ràng, không cần setter rời rạc).
     */
    @Override
    @Transactional
    public WorkshopSessionResponseDTO register(RegisterParticipantDTO request) {
        WorkshopParticipant participant = WorkshopParticipant.builder()
                .fullName(request.fullName().trim())
                .email(request.email().trim().toLowerCase())
                .build();
        participant = participantRepository.save(participant);

        WorkshopSession session = WorkshopSession.builder()
                .participant(participant)
                .deviceId(request.deviceId().trim())
                .status(WorkshopSessionStatus.AwaitingStart)
                .build();
        session = sessionRepository.save(session);

        return sessionMapper.toDTO(session);
    }

    /**
     * Bước 2 - Sinh viên bấm "Tôi đã sẵn sàng cân" -> mở khóa cho trạm cân
     * nhận dữ liệu (giống hệt cơ chế AwaitingStart -> Pending bên hệ thống
     * Bệnh viện, tránh chốt nhầm nếu nhiều sinh viên xếp hàng gần nhau).
     */
    @Override
    @Transactional
    public WorkshopSessionResponseDTO startWeighing(Long sessionId) {
        WorkshopSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phiên đo"));

        if (session.getStatus() != WorkshopSessionStatus.AwaitingStart) {
            throw new RuntimeException("Phiên đo không ở trạng thái chờ xác nhận");
        }

        session.setStatus(WorkshopSessionStatus.Pending);
        session = sessionRepository.save(session);
        return sessionMapper.toDTO(session);
    }

    /**
     * Bước 3 - ESP32 gửi lên: chiều cao (VL53L1X, gửi liên tục) + gói BLE
     * thô của cân Xiaomi (khi bắt được). Chỉ lấy weightKg + heightCm để
     * tính BMI - KHÔNG dùng tới body composition (fat/water/muscle...) dù
     * công nghệ đã hỗ trợ, đúng yêu cầu giữ Workshop đơn giản.
     */
    @Override
    @Transactional
    public void recordMeasurement(String deviceId, String rawHex, Double heightCm, Double mockWeightKg) {
        Optional<WorkshopSession> sessionOpt = sessionRepository
                .findTopByDeviceIdAndStatusOrderByCreatedAtDesc(deviceId, WorkshopSessionStatus.Pending);
        if (sessionOpt.isEmpty()) {
            return; // Không có phiên đang chờ - bỏ qua, không báo lỗi (ESP32 gửi liên tục)
        }

        WorkshopSession session = sessionOpt.get();

        if (heightCm != null && heightCm > 0) {
            session.setHeightCm(heightCm);
            sessionRepository.save(session);
        }

        if (rawHex == null || rawHex.isBlank()) {
            return;
        }

        // ============================================================
        // MOCK BYPASS — chỉ hoạt động khi MOCK_BYPASS_ENABLED=true
        // Dùng để test full-flow (DB + Email) bằng Swagger/Postman
        // mà không cần cân Xiaomi thật.
        // ⚠️ TẮT (=false) TRƯỚC NGÀY SỰ KIỆN
        // ============================================================
        if (mockBypassEnabled && "MOCK".equalsIgnoreCase(rawHex)) {
            if (mockWeightKg == null || mockWeightKg <= 0) {
                log.warn("[MOCK] mockWeightKg bị thiếu hoặc không hợp lệ — bỏ qua.");
                return;
            }
            log.info("[MOCK] Bypass BLE decrypt: deviceId={}, weight={}kg, height={}cm",
                    deviceId, mockWeightKg, heightCm);
            session.setWeightKg(mockWeightKg);
            if (session.getHeightCm() != null && session.getHeightCm() > 0) {
                double heightM = session.getHeightCm() / 100.0;
                double bmi = mockWeightKg / (heightM * heightM);
                session.setBmi(Math.round(bmi * 10.0) / 10.0);
            }
            session.setStatus(WorkshopSessionStatus.Completed);
            session.setCompletedAt(OffsetDateTime.now());
            sessionRepository.save(session);
            sendResultEmailSafely(session);
            return;
        }
        // ============================================================

        try {
            ScaleData decoded = xiaomiDecryptor.decrypt(rawHex, scaleMac, scaleBindKey);
            if (decoded == null || decoded.weightKg == null) {
                return; // Gói BLE chưa đủ dữ liệu cân nặng - chờ gói tiếp theo
            }

            session.setWeightKg(decoded.weightKg);

            if (session.getHeightCm() != null && session.getHeightCm() > 0) {
                double heightM = session.getHeightCm() / 100.0;
                double bmi = decoded.weightKg / (heightM * heightM);
                session.setBmi(Math.round(bmi * 10.0) / 10.0);
            }

            session.setStatus(WorkshopSessionStatus.Completed);
            session.setCompletedAt(OffsetDateTime.now());
            sessionRepository.save(session);

            sendResultEmailSafely(session);
        } catch (Exception e) {
            log.error("Lỗi giải mã BLE Workshop: {}", e.getMessage());
        }
    }

    /**
     * Gửi email KHÔNG được để lỗi Resend làm hỏng cả transaction lưu kết
     * quả cân (kết quả cân quan trọng hơn, phải lưu được dù email lỗi).
     */
    private void sendResultEmailSafely(WorkshopSession session) {
        try {
            emailService.sendResultEmail(
                    session.getParticipant().getEmail(),
                    session.getParticipant().getFullName(),
                    session.getWeightKg(),
                    session.getHeightCm() != null ? session.getHeightCm() : 0,
                    session.getBmi() != null ? session.getBmi() : 0
            );
            session.setEmailSent(true);
            sessionRepository.save(session);
        } catch (Exception e) {
            log.error("Gửi email kết quả thất bại (session {}): {}", session.getId(), e.getMessage());
            // Không throw - để lần retry sau xử lý tiếp
        }
    }

    @Override
    public WorkshopSessionResponseDTO getStatus(Long sessionId) {
        WorkshopSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phiên đo"));
        return sessionMapper.toDTO(session);
    }

    @Override
    public DashboardStatsDTO getDashboardStats() {
        long total = participantRepository.count();
        long completed = sessionRepository.countByStatus(WorkshopSessionStatus.Completed);
        long pending = sessionRepository.countByStatus(WorkshopSessionStatus.Pending)
                + sessionRepository.countByStatus(WorkshopSessionStatus.AwaitingStart);

        List<WorkshopSession> completedSessions = sessionRepository
                .findByStatus(WorkshopSessionStatus.Completed);

        Double avgWeight = completedSessions.stream()
                .filter(s -> s.getWeightKg() != null)
                .mapToDouble(WorkshopSession::getWeightKg)
                .average().stream().boxed().findFirst().orElse(null);
        Double avgHeight = completedSessions.stream()
                .filter(s -> s.getHeightCm() != null)
                .mapToDouble(WorkshopSession::getHeightCm)
                .average().stream().boxed().findFirst().orElse(null);
        Double avgBmi = completedSessions.stream()
                .filter(s -> s.getBmi() != null)
                .mapToDouble(WorkshopSession::getBmi)
                .average().stream().boxed().findFirst().orElse(null);

        return new DashboardStatsDTO(total, completed, pending, avgWeight, avgHeight, avgBmi);
    }

    @Override
    public java.util.List<vn.edu.fpt.sba.intellicare.dto.response.ParticipantSessionDetailDTO> getDashboardDetails() {
        java.util.List<WorkshopSession> sessions = sessionRepository.findByStatusOrderByCompletedAtDesc(WorkshopSessionStatus.Completed);
        return sessions.stream()
                .map(s -> new vn.edu.fpt.sba.intellicare.dto.response.ParticipantSessionDetailDTO(
                        s.getParticipant() != null ? s.getParticipant().getFullName() : null,
                        s.getParticipant() != null ? s.getParticipant().getEmail() : null,
                        s.getCompletedAt() != null ? s.getCompletedAt().toString() : null,
                        s.getWeightKg(),
                        s.getHeightCm(),
                        s.getBmi()
                ))
                .toList();
    }
}
