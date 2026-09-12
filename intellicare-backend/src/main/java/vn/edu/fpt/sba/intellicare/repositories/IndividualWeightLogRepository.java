package vn.edu.fpt.sba.intellicare.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.sba.intellicare.entities.IndividualWeightLog;

import java.util.List;

public interface IndividualWeightLogRepository extends JpaRepository<IndividualWeightLog, Integer> {
    List<IndividualWeightLog> findByIndividualUser_IndividualIdOrderByMeasuredAtDesc(Integer individualId);
}
