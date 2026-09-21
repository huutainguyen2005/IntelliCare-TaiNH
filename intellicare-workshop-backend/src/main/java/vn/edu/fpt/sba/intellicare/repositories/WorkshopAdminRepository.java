package vn.edu.fpt.sba.intellicare.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.sba.intellicare.entities.WorkshopAdmin;

import java.util.Optional;

public interface WorkshopAdminRepository extends JpaRepository<WorkshopAdmin, Long> {
    Optional<WorkshopAdmin> findByUsername(String username);
}
