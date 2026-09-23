package vn.edu.fpt.sba.intellicare.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.fpt.sba.intellicare.entities.MeasurementSession;
import vn.edu.fpt.sba.intellicare.enums.SessionStatus;

import java.util.Optional;

@Repository
public interface MeasurementSessionRepository extends JpaRepository<MeasurementSession, Integer> {
    // Tìm đúng cái phiên đang chờ (Pending) để nhét cân nặng vào và đóng lại
    Optional<MeasurementSession> findTopByDevice_DeviceIdAndStatusOrderByCreatedAtDesc(String device_id, SessionStatus status);

    // Lôi ra trạng thái mới nhất của cái cân (Bất kể nó đang Pending hay Completed)
    Optional<MeasurementSession> findTopByDevice_DeviceIdOrderByCreatedAtDesc(String deviceId);
}
