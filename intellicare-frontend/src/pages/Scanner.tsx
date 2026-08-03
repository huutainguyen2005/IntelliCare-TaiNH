import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import axiosClient from "../api/axiosClient";
import Modal from "../components/Modal";
import { useCustomAuth } from "../context/AuthContext";
import { speakWeight, formatWeight } from "../utils/weightAudio";

interface CameraOption {
  id: string;
  label: string;
}

export default function Scanner() {
  const { user } = useCustomAuth();
  const [patientName, setPatientName] = useState<string>("");
  const [deviceId, setDeviceId] = useState("SCALE_001");
  const [status, setStatus] = useState<
    "IDLE" | "READY" | "PENDING" | "COMPLETED"
  >("IDLE");
  const [weightResult, setWeightResult] = useState<string | null>(null);
  const [isSubmittingScan, setIsSubmittingScan] = useState(false);

  // Đếm ngược tự động chuyển màn hình ở bước COMPLETED (15s)
  const [autoAdvanceSeconds, setAutoAdvanceSeconds] = useState(15);

  // Danh sách camera thật của máy + camera đang được chọn để quét
  const [cameras, setCameras] = useState<CameraOption[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [cameraError, setCameraError] = useState<string>("");
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);

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

  // Xử lý dữ liệu sau khi có chuỗi CCCD. Gọi đúng endpoint BE:
  // POST /api/measurements/scan-qr - BE sẽ tự tạo bệnh nhân mới nếu CCCD
  // chưa từng đo và khởi tạo phiên đo ngay lập tức.
  const processScanRaw = async (rawInput: string) => {
    const fixedText = rawInput.trim();
    if (!fixedText || isSubmittingScan) return;

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

      const session = response.data;

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
      setStatus("READY");
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

  // ============================================================
  // BƯỚC 1: LIỆT KÊ TOÀN BỘ CAMERA THẬT CỦA MÁY (chỉ 1 lần lúc vào trang)
  // ============================================================
  useEffect(() => {
    if (status !== "IDLE") return;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!devices || devices.length === 0) {
          setCameraError("Không tìm thấy camera nào trên thiết bị này!");
          return;
        }
        setCameras(devices);
        // Mặc định chọn camera đầu tiên - người dùng có thể đổi qua dropdown
        setSelectedCameraId((prev) => prev || devices[0].id);
      })
      .catch(() => {
        setCameraError(
          "Không thể truy cập camera. Vui lòng cấp quyền camera cho trang này!",
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // ============================================================
  // BƯỚC 2: KHỞI ĐỘNG QUÉT với ĐÚNG camera người dùng đã chọn
  // Tự restart lại mỗi khi selectedCameraId đổi (người dùng chọn camera khác)
  // ============================================================
  useEffect(() => {
    if (status !== "IDLE" || !selectedCameraId) return;

    let isHandled = false;
    const html5QrCode = new Html5Qrcode("reader");
    html5QrCodeRef.current = html5QrCode;

    html5QrCode
      .start(
        selectedCameraId,
        { fps: 25, qrbox: { width: 280, height: 280 }, aspectRatio: 1.0 },
        async (decodedText) => {
          if (isHandled) return; // Chặn quét trùng nhiều lần liên tiếp
          isHandled = true;
          await processScanRaw(decodedText.trim());
        },
        (_error) => {},
      )
      .then(() => {
        isScanningRef.current = true;
      })
      .catch(() => {
        setCameraError(
          "Không thể khởi động camera đã chọn. Vui lòng thử camera khác!",
        );
      });

    return () => {
      if (isScanningRef.current) {
        html5QrCode
          .stop()
          .then(() => html5QrCode.clear())
          .catch(() => {});
        isScanningRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, selectedCameraId, deviceId, user]);

  // Dùng chung cho cả bấm "Xác nhận" tay lẫn tự động hết 15s
  const resetToScanScreen = () => {
    setStatus("IDLE");
    setPatientName("");
    setWeightResult(null);
  };

  // Đếm ngược 15s ở màn KẾT QUẢ - hết giờ mà bệnh nhân không bấm "Xác nhận"
  // thì tự động quay lại màn quét cho bệnh nhân tiếp theo.
  useEffect(() => {
    if (status !== "COMPLETED") return;

    setAutoAdvanceSeconds(15);
    const countdownId = setInterval(() => {
      setAutoAdvanceSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(countdownId);
          resetToScanScreen();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

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
            setWeightResult(formatWeight(response.data.weightKg) + " kg");
            speakWeight(response.data.weightKg); // Đọc to qua loa iPad/laptop
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
            Bệnh nhân:{" "}
            <strong style={{ color: "#0f766e" }}>{patientName}</strong>
          </div>
        )}

        {status === "IDLE" && (
          <>
            <div style={styles.configSection}>
              <p style={styles.configLabel}>Quét thẻ CCCD để bắt đầu</p>

              {/* DROPDOWN CHỌN CAMERA - liệt kê đúng camera thật của máy,
                  người dùng tự chọn, không đoán tự động qua facingMode nữa */}
              {cameras.length > 0 && (
                <select
                  style={styles.cameraSelect}
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                >
                  {cameras.map((cam) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label || `Camera ${cam.id}`}
                    </option>
                  ))}
                </select>
              )}

              {cameraError && (
                <p
                  style={{
                    color: "#ef4444",
                    fontSize: "13px",
                    marginTop: "8px",
                  }}
                >
                  ⚠️ {cameraError}
                </p>
              )}

              {/* CAMERA QUÉT QR */}
              <style>{`
                #reader video {
                  transform: none !important;
                  -webkit-transform: none !important;
                }
              `}</style>
              <div
                id="reader"
                style={{
                  width: "100%",
                  overflow: "hidden",
                  borderRadius: "10px",
                  margin: "10px auto 0",
                }}
              ></div>

              {isSubmittingScan && (
                <p
                  style={{
                    color: "#0d9488",
                    fontSize: "13px",
                    fontWeight: 600,
                    marginTop: "10px",
                  }}
                >
                  Đang xử lý dữ liệu, vui lòng đợi...
                </p>
              )}
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

        {status === "READY" && (
          <div style={styles.readyCard}>
            <h3
              style={{
                color: "#0d9488",
                fontSize: "18px",
                margin: "10px 0 5px 0",
              }}
            >
              Đã xác nhận
            </h3>
            <p
              style={{
                color: "#64748b",
                fontSize: "14px",
                marginBottom: "20px",
              }}
            >
              Vui lòng bước lên bàn cân khi đã sẵn sàng.
            </p>
            <button
              onClick={async () => {
                try {
                  await axiosClient.post("/api/measurements/start-weighing", {
                    deviceId,
                  });
                  setStatus("PENDING");
                } catch (error: any) {
                  const backendMsg = error.response?.data?.message;
                  showModal(
                    backendMsg ||
                      "Không thể bắt đầu phiên cân. Vui lòng quét lại CCCD!",
                    "error",
                    () => resetToScanScreen(),
                  );
                }
              }}
              style={styles.btnSuccess}
            >
              TIẾN HÀNH CÂN
            </button>
          </div>
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

            {/* NÚT GIẢ LẬP CÂN - CHỈ HIỆN LÚC "npm run dev" (import.meta.env.DEV
                tự động là false khi build production, KHÔNG BAO GIỜ lộ ra bản
                thật chạy trên Kiosk). Dùng để test không cần cân vật lý. */}
            {import.meta.env.DEV && (
              <button
                onClick={async () => {
                  const fakeWeight =
                    Math.round((40 + Math.random() * 60) * 100) / 100;
                  try {
                    await axiosClient.post("/api/measurements/submit", {
                      deviceId,
                      weightKg: fakeWeight,
                    });
                  } catch (error: any) {
                    const backendMsg = error.response?.data;
                    showModal(
                      typeof backendMsg === "string"
                        ? backendMsg
                        : "Giả lập cân thất bại (xem Console).",
                      "error",
                    );
                    console.error(error);
                  }
                }}
                style={styles.btnDevSimulate}
              >
                🧪 [DEV] Giả lập cân ngay
              </button>
            )}
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
            <button onClick={resetToScanScreen} style={styles.btnSuccess}>
              XÁC NHẬN
            </button>
            <p style={styles.autoAdvanceText}>
              Tự động chuyển sau {autoAdvanceSeconds} giây...
            </p>
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
  cameraSelect: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    fontWeight: 600,
    color: "#334155",
    backgroundColor: "#ffffff",
    outline: "none",
    cursor: "pointer",
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
  btnDevSimulate: {
    marginTop: "16px",
    width: "100%",
    padding: "10px",
    backgroundColor: "#fef3c7",
    color: "#92400e",
    border: "1px dashed #f59e0b",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
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
  readyCard: {
    padding: "30px 20px",
    border: "2px solid #0d9488",
    borderRadius: "16px",
    backgroundColor: "#f0fdfa",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  readyIcon: {
    fontSize: "40px",
  },
  autoAdvanceText: {
    marginTop: "12px",
    fontSize: "12px",
    color: "#94a3b8",
    fontStyle: "italic",
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
