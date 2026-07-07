package vn.edu.fpt.sba.intellicare.services.impl;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import vn.edu.fpt.sba.intellicare.dto.request.PatientRegisterDTO;
import vn.edu.fpt.sba.intellicare.dto.response.PatientDetailResponseDTO;
import vn.edu.fpt.sba.intellicare.dto.response.WeightLogResponseDTO;
import vn.edu.fpt.sba.intellicare.entities.Patient;
import vn.edu.fpt.sba.intellicare.repositories.PatientRepository;
import vn.edu.fpt.sba.intellicare.services.IPatientService;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PatientServiceImpl implements IPatientService {
    
    private final PatientRepository patientRepository;

    @Override
    public List<PatientDetailResponseDTO> findAll() {
        return patientRepository.findAll().stream().map(this::toDetailDTO).toList();
    }

    @Override
    public PatientDetailResponseDTO findById(Integer id) {
        return patientRepository.findById(id).map(this::toDetailDTO)
                .orElse(null);
    }
    @Transactional
    @Override
    public Patient save(PatientRegisterDTO request) {

        if (patientRepository.existsByPhoneNumber(request.getPhoneNumber())) {
            throw new RuntimeException("Duplicate phone number: Số điện thoại này đã tồn tại trong hệ thống");
        }

        // 1. Ánh xạ sang Entity
        Patient patient = new Patient();
        patient.setFullName(request.getFullName());
        patient.setPhoneNumber(request.getPhoneNumber());

        // Cập nhật thêm password từ request
        patient.setPassword(request.getPassword());

        patient.setDob(request.getDob());
        patient.setGender(request.getGender());
        patient.setFaceImageUrl(request.getFaceImageUrl());
        patient.setPatientCode("TEMP_CODE");
        // 2. Lưu lần đầu để có ID
        Patient savedPatient = patientRepository.save(patient);

        // 3. Tạo mã BNXXXX (ví dụ BN0001)
        // String.format("%04d", id) sẽ tạo ra 4 chữ số, tự thêm số 0 vào trước
        String code = "BN" + String.format("%04d", savedPatient.getPatientId());
        savedPatient.setPatientCode(code);

        // 4. Lưu lại lần nữa (Update)
        return patientRepository.save(savedPatient);
    }

    @Override
    public Patient update(Integer id, Patient patientInput) {
        return null;
    }

    @Override
    public void delete(Integer id) {

    }

    @Override
    public Page<PatientDetailResponseDTO> findAll(Pageable pageable) {
        return patientRepository.findAll(pageable).map(this::toDetailDTO);
    }

    // Implement hàm tìm kiếm theo tên hỗ trợ tiếng Việt không dấu
    @Override
    public List<PatientDetailResponseDTO> searchPatientsByKeyword(String keyword) {

        // Gọi hàm Native Query có chứa cấu hình COLLATE
        return patientRepository.searchByKeyword(keyword)
                .stream()
                .map(this::toDetailDTO)
                .collect(Collectors.toList());
    }

    // Trong PatientService.java
    public PatientDetailResponseDTO toDetailDTO(Patient patient) {
        List<WeightLogResponseDTO> logDTOs = patient.getWeightLogs().stream()
                .map(log -> new WeightLogResponseDTO(
                        log.getLogId(),
                        patient.getFullName(),
                        log.getWeightKg(),
                        log.getDevice().getDeviceId(),
                        log.getMeasuredAt()
                ))
                .collect(Collectors.toList());

        return new PatientDetailResponseDTO(
                patient.getPatientId(),
                patient.getPatientCode(),
                patient.getPhoneNumber(),
                patient.getFullName(),
                patient.getDob(),
                patient.getGender(),
                null, // Thay bằng giá trị height thật nếu có
                patient.getFaceImageUrl(),
                logDTOs
        );
    }
}