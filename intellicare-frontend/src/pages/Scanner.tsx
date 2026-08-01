import React, { useState, useEffect, useRef } from "react";
import axiosClient from "../api/axiosClient";
import Modal from "../components/Modal";
import { useCustomAuth } from "../context/AuthContext";

export default function Scanner() {
  const { user } = useCustomAuth();
  const [patientName, setPatientName] = useState<string>("");
  const [deviceId, setDeviceId] = useState("SCALE-DEMO-01");
  const [status, setStatus] = useState<"IDLE" | "PENDING" | "COMPLETED">(
    "IDLE",
  );
  const [weightResult, setWeightResult] = useState<string | null>(null);
  const [isSubmittingScan, setIsSubmittingScan] = useState(false);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "warning";
    onConfirm?: () => void;
  }>({ isOpen: false, message: "", type: "warning" });

  const showModal = (
    message: string,
    type: "success" | "error" | "warning",
    onConfirm?: () => void,
  ) => {
    setModalConfig({ isOpen: true, message, type, onConfirm });
  };

  const handleCloseModal = () => {
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
    if (modalConfig.onConfirm) modalConfig.onConfirm();
  };

  // Ô input ẩn luôn giữ focus để "hứng" chuỗi ký tự máy quét gõ vào
  // (Máy quét mã vạch hoạt động như bàn phím USB - gõ text rồi Enter)
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const [scanBuffer, setScanBuffer] = useState("");

  // Xử lý dữ liệu sau khi máy quét gửi xong 1 lần quét (kết thúc bằng Enter)
  // Gọi đúng endpoint BE: POST /api/measurements/scan-qr
  // BE sẽ tự tạo bệnh nhân mới nếu CCCD chưa từng đo (không cần OTP tại kiosk)
  // và khởi tạo phiên đo ngay lập tức, trả về MeasurementSessionResponseDTO.
  const processScanRaw = async (rawInput: string) => {
    const fixedText = rawInput.trim();
    if (!fixedText || isSubmittingScan) return;

    // Validate nhanh: mã CCCD hợp lệ phải tách được ít nhất 7 trường
    if (fixedText.split("|").length < 7) {
      showModal(
        "Dữ liệu quét không hợp lệ (không đúng định dạng CCCD). Vui lòng quét lại!",
        "warning",
      );
      return;
    }

    setIsSubmittingScan(true);
    try {
      const response = await axiosClient.post("/api/measurements/scan-qr", {
        deviceId: deviceId,
        rawQrData: fixedText,
      });

      const session = response.data; // MeasurementSessionResponseDTO

      // Chặn bệnh nhân quét CCCD của người khác (khi đang đăng nhập là patient)
      if (user && user.role === "ROLE_PATIENT") {
        if (session.patientName !== user.fullName) {
          showModal(
            `Lỗi xác thực: Bạn đang đăng nhập là ${user.fullName}, không thể quét CCCD của ${session.patientName}!`,
            "error",
          );
          return;
        }
      }

      setPatientName(session.patientName);
      setStatus("PENDING");
    } catch (error: any) {
      const backendMsg =
        typeof error.response?.data === "string"
          ? error.response.data
          : error.response?.data?.message;
      showModal(backendMsg || "Lỗi mạng/Hệ thống: " + error.message, "error");
    } finally {
      setIsSubmittingScan(false);
    }
  };

  // Giữ focus liên tục vào ô input ẩn để bất kỳ lúc nào máy quét "gõ"
  // dữ liệu vào, trình duyệt cũng nhận được (chỉ khi đang chờ quét)
  useEffect(() => {
    if (status !== "IDLE") return;

    const focusHiddenInput = () => scannerInputRef.current?.focus();
    focusHiddenInput();

    // Phòng trường hợp người dùng lỡ click ra chỗ khác làm mất focus
    const intervalId = setInterval(focusHiddenInput, 400);
    document.addEventListener("click", focusHiddenInput);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("click", focusHiddenInput);
    };
  }, [status]);

  const handleScannerFormSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Máy quét gửi phím Enter -> form submit thay vì reload trang
    const raw = scanBuffer;
    setScanBuffer("");
    processScanRaw(raw);
  };

  // Lắng nghe kết quả Cân nặng từ IoT
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (status === "PENDING") {
      intervalId = setInterval(async () => {
        try {
          const response = await axiosClient.get(
            `/api/measurements/result?deviceId=${deviceId}`,
          );
          if (response.data.status === "Completed") {
            setStatus("COMPLETED");
            setWeightResult(response.data.weightKg + " kg");
          }
        } catch (error) {
          console.error("Đang chờ cân...");
        }
      }, 2000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [status, deviceId]);

  return (
    <div style={styles.appContainer}>
      <div style={styles.card}>
        <h2 style={styles.appTitle}>TRẠM ĐO KHÁM TỰ ĐỘNG</h2>

        {patientName && (
          <div style={styles.alertBox}>
            🧬 Bệnh nhân:{" "}
            <strong style={{ color: "#0f766e" }}>{patientName}</strong>
          </div>
        )}

        {status === "IDLE" && (
          <>
            <div style={styles.configSection}>
              <p style={styles.configLabel}>Quét thẻ CCCD để bắt đầu</p>
              <div style={styles.waitingScanBox}>
                <p
                  style={{
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  {isSubmittingScan
                    ? "Đang xử lý dữ liệu, vui lòng đợi..."
                    : "Đưa mặt trước CCCD (mã QR) vào đầu đọc máy quét..."}
                </p>
              </div>
              {/* Form ẩn: máy quét mã vạch hoạt động như bàn phím, gõ chuỗi
                  dữ liệu rồi gửi phím Enter -> trigger submit form này */}
              <form onSubmit={handleScannerFormSubmit}>
                <input
                  ref={scannerInputRef}
                  value={scanBuffer}
                  onChange={(e) => setScanBuffer(e.target.value)}
                  autoFocus
                  disabled={isSubmittingScan}
                  // Ẩn hoàn toàn khỏi mắt người dùng nhưng vẫn nhận được
                  // sự kiện bàn phím vì vẫn nằm trong luồng DOM & có focus
                  style={{
                    position: "absolute",
                    opacity: 0,
                    height: 0,
                    width: 0,
                    border: "none",
                    padding: 0,
                  }}
                />
              </form>
            </div>

            <div style={{ marginTop: "15px" }}>
              <p style={{ ...styles.configLabel, fontSize: "12px" }}>
                Mã thiết bị kết nối:
              </p>
              <input
                style={{
                  ...styles.inputField,
                  padding: "6px",
                  fontSize: "14px",
                }}
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
              />
            </div>
          </>
        )}

        {status === "PENDING" && (
          <div style={styles.pendingCard}>
            <div style={styles.pulseSpinner}></div>
            <h3
              style={{
                color: "#0d9488",
                fontSize: "18px",
                margin: "15px 0 5px 0",
              }}
            >
              MÁY CÂN ĐÃ SẴN SÀNG
            </h3>
            <p style={{ color: "#64748b", fontSize: "14px" }}>
              Vui lòng bước lên bàn cân và đứng vững...
            </p>
          </div>
        )}

        {status === "COMPLETED" && (
          <div style={styles.completedCard}>
            <h2
              style={{
                fontSize: "14px",
                color: "#15803d",
                letterSpacing: "1px",
                margin: "0 0 10px 0",
              }}
            >
              KẾT QUẢ ĐO CỦA BẠN
            </h2>
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
          </div>
        )}
      </div>
      <Modal
        isOpen={modalConfig.isOpen}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={handleCloseModal}
      />
    </div>
  );
}

// Giữ nguyên Object styles cũ
const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "calc(100vh - 80px)",
    background: "var(--bg)",
    padding: "20px",
    fontFamily: "'Segoe UI', Roboto, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "460px",
    backgroundColor: "#ffffff",
    borderRadius: "24px",
    padding: "35px",
    boxShadow: "0 10px 25px -5px rgba(13, 148, 136, 0.08)",
    border: "1px solid #ccfbf1",
    textAlign: "center",
  },
  appTitle: {
    fontSize: "22px",
    fontWeight: 800,
    color: "#0d9488",
    marginBottom: "20px",
    letterSpacing: "0.5px",
  },
  alertBox: {
    backgroundColor: "#ccfbf1",
    color: "#115e59",
    padding: "14px",
    borderRadius: "14px",
    fontSize: "15px",
    fontWeight: 600,
    marginBottom: "25px",
    lineHeight: "1.5",
    border: "1px solid rgba(13, 148, 136, 0.15)",
  },
  configSection: {
    border: "1px dashed #cbd5e1",
    padding: "10px",
    borderRadius: "16px",
    marginBottom: "15px",
    backgroundColor: "#f8fafc",
  },
  configLabel: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#475569",
    marginBottom: "10px",
  },
  waitingScanBox: {
    padding: "30px 15px",
    textAlign: "center",
    borderRadius: "10px",
  },
  inputField: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
    color: "#0f766e",
    fontWeight: "bold",
    outline: "none",
    backgroundColor: "#ffffff",
    boxSizing: "border-box",
    marginBottom: "15px",
  },
  btnSuccess: {
    width: "100%",
    padding: "14px",
    backgroundColor: "#0d9488",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 10px rgba(13, 148, 136, 0.2)",
    transition: "0.2s",
  },
  pendingCard: {
    padding: "30px 20px",
    border: "2px solid #2dd4bf",
    borderRadius: "16px",
    backgroundColor: "#f0fdfa",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  pulseSpinner: {
    width: "24px",
    height: "24px",
    backgroundColor: "#0d9488",
    borderRadius: "50%",
    animation: "re-render 1.2s infinite ease-in-out",
  },
  completedCard: {
    padding: "30px 20px",
    border: "2px solid #4ade80",
    borderRadius: "16px",
    backgroundColor: "#f0fdf4",
  },
  weightDisplay: {
    fontSize: "48px",
    fontWeight: 900,
    color: "#16a34a",
    margin: "10px 0 20px 0",
  },
};
