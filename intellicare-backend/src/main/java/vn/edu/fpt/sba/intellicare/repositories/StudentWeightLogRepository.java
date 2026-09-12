package vn.edu.fpt.sba.intellicare.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.sba.intellicare.entities.StudentWeightLog;

import java.util.List;
import java.util.Optional;

public interface StudentWeightLogRepository extends JpaRepository<StudentWeightLog, Integer> {

    Optional<StudentWeightLog> findTopByDevice_DeviceIdAndStudent_StudentIdOrderByLogIdDesc(
            String deviceId, Integer studentId);

    List<StudentWeightLog> findByStudent_StudentIdOrderByMeasuredAtDesc(Integer studentId);
}
