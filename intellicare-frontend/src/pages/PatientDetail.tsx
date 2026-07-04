import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";

// FIX: Định nghĩa cấu trúc cho 1 dòng lịch sử đo
interface WeightLog {
  logId: number;
  measuredAt: string;
  weightKg: number;
}

// FIX: Định nghĩa cấu trúc chi tiết của Bệnh nhân
interface PatientDetailData {
  patientCode: string;
  fullName: string;
  phoneNumber: string;
  dob: string;
  logDTOs: WeightLog[];
}

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // FIX: Thay <any> bằng <PatientDetailData | null>
  const [patient, setPatient] = useState<PatientDetailData | null>(null);

  useEffect(() => {
    axiosClient.get(`/api/patients/${id}`).then((res) => setPatient(res.data));
  }, [id]);

  if (!patient)
    return (
      <div className="app-container text-center">
        <h2 className="app-title">Đang tải hồ sơ...</h2>
      </div>
    );

  return (
    <div className="app-container" style={{ maxWidth: "700px" }}>
      <button
        onClick={() => navigate("/dashboard")}
        className="btn-primary btn-outline"
        style={{ width: "auto", padding: "8px 20px", marginBottom: "20px" }}
      >
        ⬅ QUAY LẠI
      </button>

      <h2 className="app-title">HỒ SƠ BỆNH NHÂN</h2>

      <div className="info-section">
        <div className="info-row">
          <span className="info-label">Mã số:</span>
          <span className="info-value">{patient.patientCode}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Họ và tên:</span>
          <span className="info-value">{patient.fullName}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Số điện thoại:</span>
          <span className="info-value">{patient.phoneNumber}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Ngày sinh:</span>
          <span className="info-value">{patient.dob}</span>
        </div>
      </div>

      <h3
        style={{
          marginTop: "40px",
          borderBottom: "2px solid var(--border)",
          paddingBottom: "10px",
        }}
      >
        LỊCH SỬ ĐO CÂN NẶNG
      </h3>
      <div>
        {patient.logDTOs && patient.logDTOs.length > 0 ? (
          // FIX: Đổi kiểu log từ (log: any) thành (log: WeightLog)
          patient.logDTOs.map((log: WeightLog) => (
            <div
              key={log.logId}
              className="info-row"
              style={{
                backgroundColor: "#eff6ff",
                padding: "15px 20px",
                borderRadius: "8px",
                marginBottom: "10px",
              }}
            >
              <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                {new Date(log.measuredAt).toLocaleString("vi-VN")}
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "900",
                  color: "var(--accent)",
                }}
              >
                {log.weightKg} kg
              </div>
            </div>
          ))
        ) : (
          <p className="fs-large text-center mt-20">
            Bệnh nhân này chưa có dữ liệu đo.
          </p>
        )}
      </div>
    </div>
  );
}
