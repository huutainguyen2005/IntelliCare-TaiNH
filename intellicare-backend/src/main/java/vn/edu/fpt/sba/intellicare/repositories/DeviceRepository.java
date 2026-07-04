package vn.edu.fpt.sba.intellicare.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.fpt.sba.intellicare.dto.response.DeviceDetailResponseDTO;
import vn.edu.fpt.sba.intellicare.entities.Device;

import java.util.Optional;

@Repository
public interface DeviceRepository extends JpaRepository<Device, String> {
    Optional<Device> findByDeviceId(String deviceId);
}
