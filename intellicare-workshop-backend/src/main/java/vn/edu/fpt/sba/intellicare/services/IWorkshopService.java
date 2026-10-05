package vn.edu.fpt.sba.intellicare.services;

import vn.edu.fpt.sba.intellicare.dto.request.RegisterParticipantDTO;
import vn.edu.fpt.sba.intellicare.dto.response.DashboardStatsDTO;
import vn.edu.fpt.sba.intellicare.dto.response.WorkshopSessionResponseDTO;
import vn.edu.fpt.sba.intellicare.dto.response.ParticipantSessionDetailDTO;

import java.util.List;
import java.util.UUID;

public interface IWorkshopService {

    WorkshopSessionResponseDTO register(RegisterParticipantDTO request);

    WorkshopSessionResponseDTO startWeighing(UUID sessionId);

    void recordMeasurement(String deviceId, String rawHex, Double heightCm, Double mockWeightKg);

    WorkshopSessionResponseDTO getStatus(UUID sessionId);

    DashboardStatsDTO getDashboardStats();

    List<ParticipantSessionDetailDTO> getDashboardDetails();
}