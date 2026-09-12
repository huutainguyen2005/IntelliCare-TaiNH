package vn.edu.fpt.sba.intellicare.controllers;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.sba.intellicare.dto.request.ClassCreateDTO;
import vn.edu.fpt.sba.intellicare.dto.request.SchoolCreateDTO;
import vn.edu.fpt.sba.intellicare.dto.request.StudentCreateDTO;
import vn.edu.fpt.sba.intellicare.dto.response.StudentResponseDTO;
import vn.edu.fpt.sba.intellicare.entities.School;
import vn.edu.fpt.sba.intellicare.entities.SchoolClass;
import vn.edu.fpt.sba.intellicare.entities.Student;
import vn.edu.fpt.sba.intellicare.repositories.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * CRUD Truong / Lop / Hoc sinh - danh cho Admin thiet lap du lieu truoc khi
 * Giao vien co the bat dau buoi diem danh can (RollCallController).
 */
@RestController
@RequestMapping("/api/schools")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class SchoolManagementController {

    private final SchoolRepository schoolRepository;
    private final SchoolClassRepository classRepository;
    private final StudentRepository studentRepository;
    private final StudentWeightLogRepository weightLogRepository;

    // ===== SCHOOL =====

    @GetMapping("")
    public List<School> listSchools() {
        return schoolRepository.findAll();
    }

    @PostMapping("")
    public ResponseEntity<?> createSchool(@Valid @RequestBody SchoolCreateDTO request) {
        School school = new School();
        school.setName(request.name().trim());
        school.setAddress(request.address());
        return ResponseEntity.ok(schoolRepository.save(school));
    }

    // ===== CLASS =====

    @GetMapping("/{schoolId}/classes")
    public List<SchoolClass> listClasses(@PathVariable Integer schoolId) {
        return classRepository.findBySchool_SchoolId(schoolId);
    }

    @PostMapping("/classes")
    public ResponseEntity<?> createClass(@Valid @RequestBody ClassCreateDTO request) {
        School school = schoolRepository.findById(request.schoolId())
                .orElse(null);
        if (school == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Không tìm thấy trường"));
        }
        SchoolClass schoolClass = new SchoolClass();
        schoolClass.setSchool(school);
        schoolClass.setName(request.name().trim());
        return ResponseEntity.ok(classRepository.save(schoolClass));
    }

    // ===== STUDENT =====

    @GetMapping("/classes/{classId}/students")
    public List<StudentResponseDTO> listStudents(@PathVariable Integer classId) {
        return studentRepository.findBySchoolClass_ClassIdOrderByIndexNumberAsc(classId)
                .stream()
                .map(this::toStudentDTO)
                .toList();
    }

    @PostMapping("/classes/{classId}/students")
    public ResponseEntity<?> addStudent(
            @PathVariable Integer classId, @Valid @RequestBody StudentCreateDTO request) {
        SchoolClass schoolClass = classRepository.findById(classId).orElse(null);
        if (schoolClass == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Không tìm thấy lớp học"));
        }

        Student student = new Student();
        student.setSchoolClass(schoolClass);
        student.setFullName(request.fullName().trim());
        student.setGender(request.gender());
        student.setIndexNumber(request.indexNumber());

        if (request.dob() != null && !request.dob().isBlank()) {
            try {
                student.setDob(LocalDate.parse(request.dob(), DateTimeFormatter.ofPattern("dd/MM/yyyy")));
            } catch (Exception ignored) {
                // Bo qua neu parse loi, khong chan viec tao hoc sinh chi vi sai dinh dang ngay
            }
        }

        return ResponseEntity.ok(toStudentDTO(studentRepository.save(student)));
    }

    @DeleteMapping("/students/{studentId}")
    public ResponseEntity<?> removeStudent(@PathVariable Integer studentId) {
        if (!studentRepository.existsById(studentId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Không tìm thấy học sinh"));
        }
        // Xoa mem (is_active=false) thay vi xoa cung - giu lai lich su can
        Student student = studentRepository.findById(studentId).get();
        student.setIsActive(false);
        studentRepository.save(student);
        return ResponseEntity.ok(Map.of("message", "Đã xóa học sinh khỏi lớp"));
    }

    private StudentResponseDTO toStudentDTO(Student s) {
        Double latestWeight = weightLogRepository
                .findByStudent_StudentIdOrderByMeasuredAtDesc(s.getStudentId())
                .stream()
                .findFirst()
                .map(log -> log.getWeightKg())
                .orElse(null);

        return new StudentResponseDTO(
                s.getStudentId(),
                s.getSchoolClass().getClassId(),
                s.getSchoolClass().getName(),
                s.getFullName(),
                s.getDob() != null ? s.getDob().toString() : null,
                s.getGender(),
                s.getIndexNumber(),
                s.getIsActive(),
                latestWeight
        );
    }
}
