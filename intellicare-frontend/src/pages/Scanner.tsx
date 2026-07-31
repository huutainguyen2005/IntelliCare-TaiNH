import React, { useState, useEffect, useRef } from "react";
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

  // Ô input ẩn luôn giữ focus để "hứng" chuỗi ký tự máy quét gõ vào
  // (Máy quét mã vạch hoạt động như bàn phím USB - gõ text rồi Enter)
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const [scanBuffer, setScanBuffer] = useState("");

  // Parse chuỗi CCCD dạng:
  // [CCCD]|[CMND cũ]|[Họ và tên]|[Ngày sinh DDMMYYYY]|[Giới tính]|[Địa chỉ]|[Ngày cấp DDMMYYYY]
  const parseCccdQr = (raw: string) => {
    const parts = raw.split("|").map((p) => p.trim());
    const [idCard, oldIdCard, fullName, dobRaw, gender, address, issueDateRaw] =
      parts;

    // Đổi DDMMYYYY -> YYYY-MM-DD để khớp định dạng BE thường dùng
    const toIsoDate = (d?: string) => {
      if (!d || d.length !== 8) return "";
      const day = d.slice(0, 2);
      const month = d.slice(2, 4);
      const year = d.slice(4, 8);
      return `${year}-${month}-${day}`;
    };

    return {
      idCard: idCard || "",
      oldIdCard: oldIdCard || "", // Có thể rỗng nếu không có CMND cũ
      fullName: fullName || "",
      dob: toIsoDate(dobRaw),
      gender: gender || "",
      address: address || "",
      issueDate: toIsoDate(issueDateRaw),
    };
  };

  // Xử lý dữ liệu sau khi máy quét gửi xong 1 lần quét (kết thúc bằng Enter)
  const processScanRaw = async (rawInput: string) => {
    const fixedText = rawInput.trim();
    if (!fixedText) return;

    // Validate nhanh: mã CCCD hợp lệ phải tách được ít nhất 5 trường
    if (fixedText.split("|").length < 5) {
      showModal(
        "Dữ liệu quét không hợp lệ (không đúng định dạng CCCD). Vui lòng quét lại!",
        "warning",
      );
      return;
    }

    try {
      const response = await axiosClient.post(
        "/api/measurements/check-qr-auth",
        {
          deviceId: deviceId,
          rawQrData: fixedText,
        },
      );

      // Chặn bệnh nhân quét CCCD của người khác
      if (user && user.role === "ROLE_PATIENT") {
        const scannedName = response.data.isNew
          ? response.data.parsedData.fullName
          : response.data.session.patientName;

        if (scannedName !== user.fullName) {
          showModal(
            `Lỗi xác thực: Bạn đang đăng nhập là ${user.fullName}, không thể quét CCCD của ${scannedName}!`,
            "error",
          );
          setStatus("IDLE");
          return;
        }
      }

      if (response.data.isNew) {
        setParsedData(response.data.parsedData ?? parseCccdQr(fixedText));
        setShowAuthModal(true);
      } else {
        setPatientName(response.data.session.patientName);
        setStatus("PENDING");
      }
    } catch (error: any) {
      showModal("Lỗi mạng/Hệ thống: " + error.message, "error");
      setStatus("IDLE");
    }
  };

  // Giữ focus liên tục vào ô input ẩn để bất kỳ lúc nào máy quét "gõ"
  // dữ liệu vào, trình duyệt cũng nhận được (chỉ khi đang chờ quét)
  useEffect(() => {
    if (status !== "IDLE" || showAuthModal) return;

    const focusHiddenInput = () => scannerInputRef.current?.focus();
    focusHiddenInput();

    // Phòng trường hợp người dùng lỡ click ra chỗ khác làm mất focus
    const intervalId = setInterval(focusHiddenInput, 400);
    document.addEventListener("click", focusHiddenInput);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("click", focusHiddenInput);
    };
  }, [status, showAuthModal]);

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

  // Gửi OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    const phoneRegex = /^0(3[2-9]|5[25689]|7[06789]|8[1-9]|9\d)\d{7}$/;
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
              <div style={styles.waitingScanBox}>
                <p
                  style={{
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  Đưa mặt trước CCCD (mã QR) vào đầu đọc máy quét...
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
