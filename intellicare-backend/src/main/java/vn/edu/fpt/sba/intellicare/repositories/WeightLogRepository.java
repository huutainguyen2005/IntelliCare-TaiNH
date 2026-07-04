package vn.edu.fpt.sba.intellicare.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.fpt.sba.intellicare.entities.WeightLog;

import java.util.List;
import java.util.Optional;

@Repository
public interface WeightLogRepository extends JpaRepository<WeightLog, Integer> {

    // Tìm kết quả cân nặng mới nhất dựa vào ID Cân và ID Bệnh nhân
    Optional<WeightLog> findTopByDevice_DeviceIdAndPatient_PatientIdOrderByLogIdDesc(String deviceId, Integer patientId);
    List<WeightLog> findAllByPatient_PatientId(Integer patientId);
}
