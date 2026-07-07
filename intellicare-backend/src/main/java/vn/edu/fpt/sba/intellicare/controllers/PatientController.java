package vn.edu.fpt.sba.intellicare.controllers;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.sba.intellicare.dto.request.PatientRequestDTO;
import vn.edu.fpt.sba.intellicare.dto.response.PageResponseDTO;
import vn.edu.fpt.sba.intellicare.dto.response.PatientDetailResponseDTO;
import vn.edu.fpt.sba.intellicare.entities.Patient;
import vn.edu.fpt.sba.intellicare.services.IPatientService;

import java.util.List;

@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
public class PatientController {
    
    private final IPatientService patientService;

    @GetMapping("")
    public PageResponseDTO<PatientDetailResponseDTO> artistList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<PatientDetailResponseDTO> pageRes = patientService.findAll(pageable);
        return PageResponseDTO.of(pageRes);
    }

    @GetMapping("/{id}")
    public PatientDetailResponseDTO getPatientById(@PathVariable Integer id) {
        // Vi du minh hoa

        return patientService.findById(id);
    }

    @PostMapping("/")
    public Patient createPatient(@Valid @RequestBody PatientRequestDTO request) {
        return patientService.save(request);
    }

    // Đổi tên biến từ 'name' thành 'keyword' để thể hiện tính đa năng
    @GetMapping("/search")
    public ResponseEntity<List<PatientDetailResponseDTO>> searchPatients(@RequestParam String keyword) {
        List<PatientDetailResponseDTO> result = patientService.searchPatientsByKeyword(keyword);
        return ResponseEntity.ok(result);
    }
}
