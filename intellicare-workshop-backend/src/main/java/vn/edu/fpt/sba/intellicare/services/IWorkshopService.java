package vn.edu.fpt.sba.intellicare.services;

import vn.edu.fpt.sba.intellicare.dto.request.RegisterParticipantDTO;
import vn.edu.fpt.sba.intellicare.dto.response.DashboardStatsDTO;
import vn.edu.fpt.sba.intellicare.dto.response.WorkshopSessionResponseDTO;

public interface IWorkshopService {

    WorkshopSessionResponseDTO register(RegisterParticipantDTO request);

    WorkshopSessionResponseDTO startWeighing(Long sessionId);

    void recordMeasurement(String deviceId, String rawHex, Double heightCm);

    WorkshopSessionResponseDTO getStatus(Long sessionId);

    DashboardStatsDTO getDashboardStats();
}
