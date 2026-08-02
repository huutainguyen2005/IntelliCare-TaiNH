package vn.edu.fpt.sba.intellicare.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.sba.intellicare.dto.response.DashboardStatsDTO;
import vn.edu.fpt.sba.intellicare.entities.Device;
import vn.edu.fpt.sba.intellicare.entities.MeasurementSession;
import vn.edu.fpt.sba.intellicare.entities.Patient;
import vn.edu.fpt.sba.intellicare.entities.Staff;
import vn.edu.fpt.sba.intellicare.entities.WeightLog;
import vn.edu.fpt.sba.intellicare.enums.AccountStatus;
import vn.edu.fpt.sba.intellicare.enums.Role;
import vn.edu.fpt.sba.intellicare.repositories.DeviceRepository;
import vn.edu.fpt.sba.intellicare.repositories.MeasurementSessionRepository;
import vn.edu.fpt.sba.intellicare.repositories.PatientRepository;
import vn.edu.fpt.sba.intellicare.repositories.StaffRepository;
import vn.edu.fpt.sba.intellicare.repositories.WeightLogRepository;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

/**
 * Số liệu tổng quan cho Admin - đặc biệt là tỉ lệ bệnh nhân "bỏ lơ" việc
 * kích hoạt tài khoản sau khi đã đo ở Kiosk (created_at có, activated_at
 * không có).
 *
 * Ghi chú: dùng findAll() + stream() thay vì viết query đếm riêng, vì quy
 * mô dữ liệu hiện tại (đồ án) còn nhỏ. Nếu số bản ghi lên tới hàng trăm
 * nghìn, nên đổi sang các query COUNT/AVG trực tiếp trên DB cho nhanh hơn.
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class DashboardController {

    private final PatientRepository patientRepository;
    private final StaffRepository staffRepository;
    private final DeviceRepository deviceRepository;
    private final MeasurementSessionRepository measurementSessionRepository;
    private final WeightLogRepository weightLogRepository;

    // Bao nhiêu ngày kể từ lúc tạo mà vẫn chưa kích hoạt thì coi là "có nguy
    // cơ bỏ cuộc" - đưa vào danh sách cảnh báo cho Admin theo dõi/liên hệ.
    private static final int STALE_THRESHOLD_DAYS = 3;

    @GetMapping("/summary")
    public ResponseEntity<DashboardStatsDTO> getSummary() {
        List<Patient> allPatients = patientRepository.findAll();
        List<Staff> allStaff = staffRepository.findAll();
        List<Device> allDevices = deviceRepository.findAll();
        List<MeasurementSession> allSessions = measurementSessionRepository.findAll();
        List<WeightLog> allWeightLogs = weightLogRepository.findAll();

        // ===== Kích hoạt tài khoản =====
        long totalPatients = allPatients.size();
        long activatedPatients = allPatients.stream()
                .filter(p -> p.getAccountStatus() == AccountStatus.ACTIVE)
                .count();
        long pendingPatients = totalPatients - activatedPatients;
        double activationRate = totalPatients == 0
                ? 0.0
                : Math.round((activatedPatients * 1000.0) / totalPatients) / 10.0;

        // Thời gian TB từ tạo -> kích hoạt (chỉ tính những người ĐÃ kích hoạt
        // và có đủ cả 2 mốc thời gian)
        List<Patient> activatedWithBothDates = allPatients.stream()
                .filter(p -> p.getActivatedAt() != null && p.getCreatedAt() != null)
                .toList();
        Double avgActivationHours = activatedWithBothDates.isEmpty()
                ? null
                : activatedWithBothDates.stream()
                .mapToLong(p -> Duration.between(p.getCreatedAt(), p.getActivatedAt()).toMinutes())
                .average()
                .orElse(0) / 60.0;

        long lockedPatients = allPatients.stream()
                .filter(p -> Boolean.FALSE.equals(p.getIsActive()))
                .count();

        // ===== Danh sách bệnh nhân "bỏ lơ" kích hoạt =====
        LocalDateTime now = LocalDateTime.now();
        List<DashboardStatsDTO.StaleActivationDTO> staleList = allPatients.stream()
                .filter(p -> p.getAccountStatus() == AccountStatus.PENDING_PASSWORD)
                .filter(p -> p.getCreatedAt() != null)
                .filter(p -> ChronoUnit.DAYS.between(p.getCreatedAt(), now) >= STALE_THRESHOLD_DAYS)
                .sorted(Comparator.comparing(Patient::getCreatedAt)) // Lâu nhất lên đầu
                .limit(20)
                .map(p -> new DashboardStatsDTO.StaleActivationDTO(
                        p.getPatientId(),
                        p.getFullName(),
                        p.getPhoneNumber(),
                        p.getCreatedAt().toString(),
                        ChronoUnit.DAYS.between(p.getCreatedAt(), now)
                ))
                .toList();

        // ===== Nhân sự =====
        long totalStaff = allStaff.stream().filter(s -> s.getRole() != Role.ADMIN).count();
        long totalDoctors = allStaff.stream().filter(s -> s.getRole() == Role.DOCTOR).count();
        long totalNurses = allStaff.stream().filter(s -> s.getRole() == Role.NURSE).count();
        long activeStaff = allStaff.stream()
                .filter(s -> s.getRole() != Role.ADMIN)
                .filter(s -> !Boolean.FALSE.equals(s.getIsActive()))
                .count();
        long lockedStaff = totalStaff - activeStaff;

        // ===== Thiết bị =====
        long totalDevices = allDevices.size();
        long activeDevices = allDevices.stream()
                .filter(d -> "Active".equalsIgnoreCase(d.getStatus()))
                .count();

        // ===== Hoạt động đo =====
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.minusDays(today.getDayOfWeek().getValue() - 1L);
        LocalDate monthStart = today.withDayOfMonth(1);

        long measurementsToday = allSessions.stream()
                .filter(s -> s.getCreatedAt() != null && s.getCreatedAt().toLocalDate().isEqual(today))
                .count();
        long measurementsThisWeek = allSessions.stream()
                .filter(s -> s.getCreatedAt() != null && !s.getCreatedAt().toLocalDate().isBefore(weekStart))
                .count();
        long measurementsThisMonth = allSessions.stream()
                .filter(s -> s.getCreatedAt() != null && !s.getCreatedAt().toLocalDate().isBefore(monthStart))
                .count();

        DashboardStatsDTO dto = new DashboardStatsDTO(
                totalPatients,
                activatedPatients,
                pendingPatients,
                activationRate,
                avgActivationHours,
                lockedPatients,
                staleList,
                totalStaff,
                totalDoctors,
                totalNurses,
                activeStaff,
                lockedStaff,
                totalDevices,
                activeDevices,
                measurementsToday,
                measurementsThisWeek,
                measurementsThisMonth,
                allWeightLogs.size()
        );

        return ResponseEntity.ok(dto);
    }
}
