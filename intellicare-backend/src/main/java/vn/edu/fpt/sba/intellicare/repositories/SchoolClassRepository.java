package vn.edu.fpt.sba.intellicare.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.sba.intellicare.entities.SchoolClass;

import java.util.List;

public interface SchoolClassRepository extends JpaRepository<SchoolClass, Integer> {
    List<SchoolClass> findBySchool_SchoolId(Integer schoolId);
}
