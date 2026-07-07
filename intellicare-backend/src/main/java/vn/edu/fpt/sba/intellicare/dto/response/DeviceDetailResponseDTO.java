package vn.edu.fpt.sba.intellicare.dto.response;

import vn.edu.fpt.sba.intellicare.entities.MeasurementSession;
import vn.edu.fpt.sba.intellicare.entities.WeightLog;

import java.util.List;

public record DeviceDetailResponseDTO (
        String deviceId,
        String location,
        String status,
        List<MeasurementSession> measurementSessions,
        List<WeightLog> weightLogs
){
}
