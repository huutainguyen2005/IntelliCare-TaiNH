package vn.edu.fpt.sba.intellicare.services;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import vn.edu.fpt.sba.intellicare.dto.request.PatientRegisterDTO;
import vn.edu.fpt.sba.intellicare.dto.response.PatientDetailResponseDTO;
import vn.edu.fpt.sba.intellicare.entities.Patient;

import java.util.List;

public interface IPatientService {

    // Trả về danh sách rút gọn để tối ưu hiệu năng (dùng PatientResponseDTO)
    List<PatientDetailResponseDTO> findAll();

    // Trả về chi tiết bệnh nhân (dùng PatientDetailResponseDTO)
    PatientDetailResponseDTO findById(Integer id);

    // Lưu và Cập nhật trả về DTO hoặc Entity tùy bạn, ở đây tôi để Entity
    Patient save(PatientRegisterDTO patientInput);
    Patient update(Integer id, Patient patientInput);

    void delete(Integer id);

    // Phân trang dùng DTO rút gọn
    Page<PatientDetailResponseDTO> findAll(Pageable pageable);

    List<PatientDetailResponseDTO> searchPatientsByKeyword(String keyword);
}