package vn.edu.fpt.sba.intellicare.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.edu.fpt.sba.intellicare.entities.Patient;

import java.util.List;
import java.util.Optional;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Integer> {
    boolean existsByPhoneNumber(String phoneNumber);
    
    Optional<Patient> findByPhoneNumber(String phoneNumber);
    
    Optional<Patient> findByEmail(String email);
    
    @Query(value = "SELECT * FROM patients WHERE LOWER(full_name) COLLATE Latin1_General_CI_AI LIKE N'%' + :keyword + '%' OR phone_number LIKE '%' + :keyword + '%'", nativeQuery = true)
    List<Patient> searchByKeyword(@Param("keyword") String keyword);
    
    @Query("SELECT COALESCE(MAX(p.patientId), 0) FROM Patient p")
    Integer findMaxPatientId();
    
    Optional<Patient> findByIdCard(String idCard);
}

