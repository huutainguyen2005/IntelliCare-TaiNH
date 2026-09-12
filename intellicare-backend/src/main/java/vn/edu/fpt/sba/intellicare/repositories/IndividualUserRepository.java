package vn.edu.fpt.sba.intellicare.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.sba.intellicare.entities.IndividualUser;

import java.util.Optional;

public interface IndividualUserRepository extends JpaRepository<IndividualUser, Integer> {
    Optional<IndividualUser> findByPhoneNumber(String phoneNumber);
    Optional<IndividualUser> findByEmail(String email);
}
