package vn.edu.fpt.sba.intellicare.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.sba.intellicare.entities.StudentMeasurementSession;
import vn.edu.fpt.sba.intellicare.enums.SessionStatus;

import java.util.Optional;

public interface StudentMeasurementSessionRepository extends JpaRepository<StudentMeasurementSession, Integer> {

    Optional<StudentMeasurementSession> findTopByDevice_DeviceIdAndStatusOrderByCreatedAtDesc(
            String deviceId, SessionStatus status);

    Optional<StudentMeasurementSession> findTopByDevice_DeviceIdOrderByCreatedAtDesc(String deviceId);

    Optional<StudentMeasurementSession> findTopByRollCallSession_SessionIdOrderByCreatedAtDesc(
            Integer rollCallSessionId);
}
