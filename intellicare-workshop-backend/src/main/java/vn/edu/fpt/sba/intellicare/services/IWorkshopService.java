package vn.edu.fpt.sba.intellicare.services;

import vn.edu.fpt.sba.intellicare.dto.request.RegisterParticipantDTO;
import vn.edu.fpt.sba.intellicare.dto.response.CurrentMeasuringDTO;
import vn.edu.fpt.sba.intellicare.dto.response.DashboardStatsDTO;
import vn.edu.fpt.sba.intellicare.dto.response.WorkshopSessionResponseDTO;
import vn.edu.fpt.sba.intellicare.dto.response.ParticipantSessionDetailDTO;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IWorkshopService {

    WorkshopSessionResponseDTO register(RegisterParticipantDTO request);

    WorkshopSessionResponseDTO startWeighing(UUID sessionId);

    void recordMeasurement(String deviceId, String rawHex, Double heightCm, Double mockWeightKg);

    WorkshopSessionResponseDTO getStatus(UUID sessionId);

    DashboardStatsDTO getDashboardStats();

    List<ParticipantSessionDetailDTO> getDashboardDetails();

    /** Ai đang đo trên cân (còn hạn)? Rỗng nếu trạm cân đang trống. */
    Optional<CurrentMeasuringDTO> getCurrentMeasuring();

    /** Admin chủ động hủy lượt đo đang chờ để người sau đo ngay, không phải đợi hết hạn. */
    void cancelMeasuring(UUID sessionId);
}