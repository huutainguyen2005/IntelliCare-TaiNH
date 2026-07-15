import React, { useState, useEffect } from "react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import axiosClient from "../api/axiosClient";
import Modal from "../components/Modal";

export default function Scanner() {
  const [patientName, setPatientName] = useState<string>("");
  const [deviceId, setDeviceId] = useState("SCALE-DEMO-01");
  const [status, setStatus] = useState<"IDLE" | "PENDING" | "COMPLETED">("IDLE");
  const [weightResult, setWeightResult] = useState<string | null>(null);
  
  const [modalConfig, setModalConfig] = useState({ isOpen: false, message: "", type: "warning" as "success" | "error" | "warning" });

  const showModal = (message: string, type: "success" | "error" | "warning") => {
    setModalConfig({ isOpen: true, message, type });
  };

  // 1. KHỞI TẠO CAMERA QUÉT MÃ VẠCH / QR CCCD
  useEffect(() => {
    if (status !== "IDLE") return;

    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 25,
        qrbox: { width: 300, height: 300 },
        aspectRatio: 1.0,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        videoConstraints: {
          facingMode: "environment", // Dùng camera sau của điện thoại để test
          advanced: [{ focusMode: "continuous" } as any],
        },
      },
      false
    );

    scanner.render(
      async (decodedText) => {
        scanner.clear(); // Tắt camera ngay sau khi quét thành công
        
        try {
          // GỌI API MỚI: Truyền thẳng rawData xuống, Backend tự lo mọi thứ
          const response = await axiosClient.post("/api/measurements/scan-qr", {
            deviceId: deviceId,
            rawQrData: decodedText,
          });

          // Backend trả về session đã khởi tạo
          setPatientName(response.data.patientName);
          setStatus("PENDING"); // Chuyển sang trạng thái chờ cân điện tử

        } catch (error: any) {
          showModal(error.response?.data || "Lỗi khi xử lý dữ liệu CCCD!", "error");
          setStatus("IDLE");
        }
      },
      (_error) => {} // Bỏ qua các lỗi khung hình không tìm thấy QR
    );

    return () => {
      scanner.clear().catch((e) => console.error(e));
    };
  }, [status, deviceId]);

  // LẮNG NGHE KẾT QUẢ TỪ CÂN ĐIỆN TỬ (POLLING)
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    if (status === "PENDING") {
      intervalId = setInterval(async () => {
        try {
          const response = await axiosClient.get(`/api/measurements/result?deviceId=${deviceId}`);
          if (response.data.status === "Completed") {
            setStatus("COMPLETED");
            setWeightResult(response.data.weightKg + " kg");
          }
        } catch (error) {
          console.error("Đang chờ dữ liệu từ cân IoT...");
        }
      }, 2000); // Hỏi server mỗi 2 giây
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [status, deviceId]);

  return (
    <div style={styles.appContainer}>
      <div style={styles.card}>
        <h2 style={styles.appTitle}>TRẠM ĐO THÔNG MINH</h2>
        
        {patientName && (
          <div style={styles.alertBox}>
            Bệnh nhân: <strong style={{ color: "#0f766e" }}>{patientName}</strong>
          </div>
        )}

        {/* TRẠNG THÁI 1: CHỜ QUÉT CCCD */}
        {status === "IDLE" && (
          <>
            <div style={styles.configSection}>
              <p style={styles.configLabel}>Đưa mã QR trên CCCD vào khung hình</p>
              <div id="reader" style={{ width: "100%", overflow: "hidden", borderRadius: "10px", margin: "0 auto" }}></div>
            </div>
            
            <div style={{ marginTop: "15px" }}>
              <p style={{ ...styles.configLabel, fontSize: "12px" }}>Mã thiết bị Test</p>
              <input style={{ ...styles.inputField, padding: "6px", fontSize: "14px" }} value={deviceId} onChange={(e) => setDeviceId(e.target.value)} />
            </div>
          </>
        )}

        {/* TRẠNG THÁI 2: ĐÃ QUÉT XONG - CHỜ BƯỚC LÊN CÂN */}
        {status === "PENDING" && (
          <div style={styles.pendingCard}>
            <div style={styles.pulseSpinner}></div>
            <h3 style={{ color: "#0d9488", fontSize: "18px", margin: "15px 0 5px 0" }}>ĐÃ KẾT NỐI</h3>
            <p style={{ color: "#64748b", fontSize: "14px" }}>Vui lòng bước lên cân để đo...</p>
          </div>
        )}

        {/* TRẠNG THÁI 3: CÓ KẾT QUẢ TỪ IOT */}
        {status === "COMPLETED" && (
          <div style={styles.completedCard}>
            <h2 style={{ fontSize: "14px", color: "#15803d", letterSpacing: "1px", margin: "0 0 10px 0" }}>KẾT QUẢ ĐO</h2>
            <div style={styles.weightDisplay}>{weightResult}</div>
            
            <button
              onClick={() => {
                setStatus("IDLE");
                setPatientName("");
                setWeightResult(null);
              }}
              style={styles.btnSuccess}
            >
              QUÉT BỆNH NHÂN TIẾP THEO
            </button>
            <p style={{marginTop: "15px", fontSize: "13px", color: "#64748b"}}>
              *Kết quả đã được đồng bộ. Quý khách có thể xem lại tại Website.
            </p>
          </div>
        )}
      </div>

      <Modal isOpen={modalConfig.isOpen} message={modalConfig.message} type={modalConfig.type} onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} />
    </div>
  );
}

const styles = {
  appContainer: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 80px)", backgroundColor: "#f0fdfa", padding: "20px", fontFamily: "'Segoe UI', Roboto, sans-serif" },
  card: { width: "100%", maxWidth: "460px", backgroundColor: "#ffffff", borderRadius: "24px", padding: "35px", boxShadow: "0 10px 25px -5px rgba(13, 148, 136, 0.08)", border: "1px solid #ccfbf1", textAlign: "center" },
  appTitle: { fontSize: "22px", fontWeight: 800, color: "#0d9488", marginBottom: "20px", letterSpacing: "0.5px" },
  alertBox: { backgroundColor: "#ccfbf1", color: "#115e59", padding: "14px", borderRadius: "14px", fontSize: "15px", fontWeight: 600, marginBottom: "25px", lineHeight: "1.5", border: "1px solid rgba(13, 148, 136, 0.15)" },
  configSection: { border: "1px dashed #cbd5e1", padding: "10px", borderRadius: "16px", marginBottom: "15px", backgroundColor: "#f8fafc" },
  configLabel: { fontSize: "14px", fontWeight: 700, color: "#475569", marginBottom: "10px" },
  inputField: { width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "16px", color: "#0f766e", fontWeight: "bold", outline: "none", backgroundColor: "#ffffff", boxSizing: "border-box", marginBottom: "15px" },
  btnSuccess: { width: "100%", padding: "14px", backgroundColor: "#0d9488", color: "#ffffff", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 10px rgba(13, 148, 136, 0.2)", transition: "0.2s" },
  pendingCard: { padding: "30px 20px", border: "2px solid #2dd4bf", borderRadius: "16px", backgroundColor: "#f0fdfa", display: "flex", flexDirection: "column", alignItems: "center" },
  pulseSpinner: { width: "24px", height: "24px", backgroundColor: "#0d9488", borderRadius: "50%", animation: "re-render 1.2s infinite ease-in-out" },
  completedCard: { padding: "30px 20px", border: "2px solid #4ade80", borderRadius: "16px", backgroundColor: "#f0fdf4" },
  weightDisplay: { fontSize: "48px", fontWeight: 900, color: "#16a34a", margin: "10px 0 20px 0" }
} as const;