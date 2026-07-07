package vn.edu.fpt.sba.intellicare.services.impl;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import vn.edu.fpt.sba.intellicare.dto.response.WeightLogResponseDTO;
import vn.edu.fpt.sba.intellicare.entities.WeightLog;
import vn.edu.fpt.sba.intellicare.repositories.WeightLogRepository;
import vn.edu.fpt.sba.intellicare.services.IWeightLogService;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WeightLogServiceImpl implements IWeightLogService {
    
    private final WeightLogRepository weightLogRepository;

    @Override
    public List<WeightLogResponseDTO> getLogsByPatientId(Integer patientId) {
        return weightLogRepository.findAllByPatient_PatientId(patientId).stream()
                .sorted(Comparator.comparing(WeightLog::getMeasuredAt).reversed())
                .map(this::toWeightLog) // Gọi đến hàm đã tách
                .collect(Collectors.toList());
    }


    private WeightLogResponseDTO toWeightLog(WeightLog log) {
        return new WeightLogResponseDTO(
                log.getLogId(),
                log.getPatient().getFullName(),
                log.getWeightKg(),
                log.getDevice().getDeviceId(),
                log.getMeasuredAt()
        );
    }
}