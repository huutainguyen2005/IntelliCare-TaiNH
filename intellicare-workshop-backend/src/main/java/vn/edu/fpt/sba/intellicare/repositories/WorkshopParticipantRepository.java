package vn.edu.fpt.sba.intellicare.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.sba.intellicare.entities.WorkshopParticipant;

import java.util.Optional;

public interface WorkshopParticipantRepository extends JpaRepository<WorkshopParticipant, Long> {

    Optional<WorkshopParticipant> findFirstByEmailOrderByIdAsc(String email);
}