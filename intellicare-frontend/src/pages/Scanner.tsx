import React, { useState, useEffect } from "react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import axiosClient from "../api/axiosClient";
import Modal from "../components/Modal";
import { auth } from "../api/firebaseConfig";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { useCustomAuth } from "../context/AuthContext";
import type { ConfirmationResult } from "firebase/auth";

// Khởi tạo Recaptcha ngoài component để tránh lỗi re-render
let recaptchaVerifierInstance: RecaptchaVerifier | null = null;

export default function Scanner() {
  const { user } = useCustomAuth();
  const [patientName, setPatientName] = useState<string>("");
  const [deviceId, setDeviceId] = useState("SCALE-DEMO-01");
  const [status, setStatus] = useState<"IDLE" | "PENDING" | "COMPLETED">(
    "IDLE",
  );
  const [weightResult, setWeightResult] = useState<string | null>(null);

  // State cho Modal Xác thực SĐT
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);

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

  // Khởi tạo Camera quét QR
  useEffect(() => {
    if (status !== "IDLE" || showAuthModal) return;

    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 25,
        qrbox: { width: 300, height: 300 },
        aspectRatio: 1.0,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        videoConstraints: {
          facingMode: "environment",
          advanced: [{ focusMode: "continuous" } as any],
        },
      },
      false,
    );

    scanner.render(
      async (decodedText) => {
        scanner.clear();
        // console.log("RAW QR DATA TỪ CAMERA:", decodedText);
        try {
          const response = await axiosClient.post(
            "/api/measurements/check-qr-auth",
            {
              deviceId: deviceId,
              rawQrData: decodedText,
            },
          );

          // Chặn bệnh nhân quét CCCD của người khác
          if (user && user.role === "ROLE_PATIENT") {
            // Lấy tên từ dữ liệu CCCD (tùy thuộc vào việc là user mới hay cũ)
            const scannedName = response.data.isNew
              ? response.data.parsedData.fullName
              : response.data.session.patientName;

            // Nếu tên trên CCCD không khớp với tên tài khoản đang đăng nhập
            if (scannedName !== user.fullName) {
              showModal(
                `Lỗi xác thực: Bạn đang đăng nhập là ${user.fullName}, không thể quét CCCD của ${scannedName}!`,
                "error",
              );
              setStatus("IDLE");
              return; // Chặn đứng luồng chạy, không cho hiển thị popup nhập OTP
            }
          }

          if (response.data.isNew) {
            setParsedData(response.data.parsedData);
            setShowAuthModal(true);
          } else {
            setPatientName(response.data.session.patientName);
            setStatus("PENDING");
          }
        } catch (error: any) {
          showModal("Lỗi mạng/Hệ thống: " + error.message, "error");
          setStatus("IDLE");
        }
      },
      (_error) => {},
    );

    return () => {
      scanner.clear().catch((e) => console.error(e));
    };
  }, [status, showAuthModal, deviceId]);

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

  // Gửi OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    const phoneRegex = /^0(3[2-9]|5[68]|7[06789]|8[1-9]|9\d)\d{7}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return showModal("Số điện thoại không hợp lệ!", "warning");
    }

    setIsLoading(true);
    try {
      // Check trùng SĐT
      await axiosClient.get(`/auth/check-duplicate?identifier=${phoneNumber}`);

      // Gửi OTP Firebase
      if (!recaptchaVerifierInstance) {
        recaptchaVerifierInstance = new RecaptchaVerifier(
          auth,
          "recaptcha-container-scanner",
          { size: "invisible" },
        );
      }
      const formattedPhone = "+84" + phoneNumber.substring(1);
      const confirmation = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        recaptchaVerifierInstance,
      );

      setConfirmationResult(confirmation);
      setIsOtpSent(true);
    } catch (error: any) {
      showModal(error.response?.data || "Lỗi gửi OTP!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Xác nhận OTP & Bắt đầu phiên đo
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return showModal("Vui lòng nhập OTP!", "warning");

    setIsLoading(true);
    try {
      // Xác thực OTP Firebase
      if (confirmationResult) await confirmationResult.confirm(otp);

      // Đăng ký bệnh nhân mới
      const payload = {
        fullName: parsedData.fullName,
        identifier: phoneNumber,
        dob: parsedData.dob, // Nhớ format lại YYYY-MM-DD ở BE
        gender: parsedData.gender,
        otp: otp,
      };
      await axiosClient.post("/auth/register", payload);

      // Bắt đầu phiên cân đo ngay lập tức
      await axiosClient.post("/api/measurements/start", {
        deviceId: deviceId,
        patientId: parsedData.idCard, // Hoặc lấy patientId sau khi register trả về
      });

      setPatientName(parsedData.fullName);
      setShowAuthModal(false);
      setStatus("PENDING");
    } catch (error: any) {
      showModal("OTP không chính xác hoặc lỗi hệ thống!", "error");
    } finally {
      setIsLoading(false);
    }
  };

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

        {status === "IDLE" && !showAuthModal && (
          <>
            <div style={styles.configSection}>
              <p style={styles.configLabel}>Quét thẻ CCCD để bắt đầu</p>
              <div
                id="reader"
                style={{
                  width: "100%",
                  overflow: "hidden",
                  borderRadius: "10px",
                  margin: "0 auto",
                }}
              ></div>
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

        {/* MODAL XÁC THỰC SỐ ĐIỆN THOẠI TRỰC TIẾP */}
        {showAuthModal && parsedData && (
          <div style={styles.authModal}>
            <h3 style={{ color: "#0f766e", marginBottom: "10px" }}>
              👋 Chào {parsedData.fullName},
            </h3>
            <p
              style={{
                fontSize: "14px",
                color: "#64748b",
                marginBottom: "20px",
              }}
            >
              Đây là lần đầu bạn sử dụng hệ thống. Vui lòng xác thực số điện
              thoại để lưu trữ hồ sơ y tế!
            </p>

            <form onSubmit={!isOtpSent ? handleSendOtp : handleVerifyOtp}>
              {!isOtpSent ? (
                <>
                  <input
                    style={styles.inputField}
                    placeholder="Nhập số điện thoại của bạn..."
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={styles.btnSuccess}
                  >
                    {isLoading ? "ĐANG GỬI..." : "GỬI MÃ OTP"}
                  </button>
                </>
              ) : (
                <>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#475569",
                      marginBottom: "10px",
                    }}
                  >
                    Mã xác thực đã gửi tới <b>{phoneNumber}</b>
                  </p>
                  <input
                    style={{
                      ...styles.inputField,
                      textAlign: "center",
                      letterSpacing: "8px",
                      fontSize: "20px",
                    }}
                    placeholder="******"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={styles.btnSuccess}
                  >
                    {isLoading ? "ĐANG XÁC THỰC..." : "HOÀN TẤT & ĐO CÂN NẶNG"}
                  </button>
                </>
              )}
            </form>
            <button
              onClick={() => {
                setShowAuthModal(false);
                setStatus("IDLE");
              }}
              style={styles.btnCancel}
            >
              Hủy bỏ
            </button>
            <div id="recaptcha-container-scanner"></div>
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

// Giữ nguyên Object styles cũ của bro, thêm CSS cho Modal Auth
const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "calc(100vh - 80px)",
    backgroundColor: "#f0fdfa",
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
  authModal: {
    padding: "20px",
    backgroundColor: "#f8fafc",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
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
  btnCancel: {
    width: "100%",
    padding: "10px",
    backgroundColor: "transparent",
    color: "#94a3b8",
    border: "none",
    marginTop: "10px",
    cursor: "pointer",
    fontWeight: 600,
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
