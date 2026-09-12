package vn.edu.fpt.sba.intellicare.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.sba.intellicare.entities.Student;

import java.util.List;

public interface StudentRepository extends JpaRepository<Student, Integer> {

    // Danh sach hoc sinh trong 1 lop, sap xep dung theo index_number (chi
    // de hien thi thu tu "1 -> 2 -> 3", khong phai khoa chinh)
    List<Student> findBySchoolClass_ClassIdOrderByIndexNumberAsc(Integer classId);

    // Tim hoc sinh TIEP THEO trong lop (dung khi giao vien bam "Xac nhan"
    // chuyen sang em ke tiep trong buoi diem danh)
    java.util.Optional<Student> findFirstBySchoolClass_ClassIdAndIndexNumberGreaterThanOrderByIndexNumberAsc(
            Integer classId, Integer currentIndexNumber);
}
