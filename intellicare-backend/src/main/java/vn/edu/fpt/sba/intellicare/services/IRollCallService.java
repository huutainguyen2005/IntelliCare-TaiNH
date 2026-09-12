package vn.edu.fpt.sba.intellicare.services;

import vn.edu.fpt.sba.intellicare.dto.response.RollCallSessionResponseDTO;
import vn.edu.fpt.sba.intellicare.entities.ClassRollCallSession;
import vn.edu.fpt.sba.intellicare.entities.Device;
import vn.edu.fpt.sba.intellicare.entities.Student;
import vn.edu.fpt.sba.intellicare.entities.StudentMeasurementSession;

public interface IRollCallService {

    RollCallSessionResponseDTO startRollCall(Integer classId, Integer teacherId, String deviceId);

    RollCallSessionResponseDTO startWeighingCurrentStudent(Integer rollCallSessionId);

    void recordWeight(String deviceId, Double weightKg);

    RollCallSessionResponseDTO getStatus(Integer rollCallSessionId);

    RollCallSessionResponseDTO confirmAndNext(Integer rollCallSessionId);
}
