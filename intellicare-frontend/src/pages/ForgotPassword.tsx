import { useState } from "react";
import axiosClient from "../api/axiosClient";
import { useNavigate } from "react-router-dom";
import Modal from "../components/Modal";
import { auth } from "../api/firebaseConfig";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";

let recaptchaVerifierInstance: RecaptchaVerifier | null = null;

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    message: "",
    type: "warning" as "success" | "error" | "warning",
    onConfirm: undefined as (() => void) | undefined,
  });
  const showModal = (
    message: string,
    type: "success" | "error" | "warning",
    onConfirm?: () => void,
  ) => setModalConfig({ isOpen: true, message, type, onConfirm });

  const isEmail = identifier.includes("@");

  // ==========================================
  // BƯỚC 1: NHẬP EMAIL/SĐT -> GỬI OTP
  // ==========================================
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      return showModal("Vui lòng nhập Email hoặc Số điện thoại!", "warning");
    }

    setLoading(true);
    try {
      if (isEmail) {
        await axiosClient.post("/auth/send-otp", { email: identifier.trim() });
        showModal("Đã gửi mã OTP vào Email của bạn!", "success");
      } else {
        if (!recaptchaVerifierInstance) {
          recaptchaVerifierInstance = new RecaptchaVerifier(
            auth,
            "recaptcha-container-forgot",
            { size: "invisible" },
          );
        }
        let phone = identifier.trim();
        if (phone.startsWith("0")) phone = "+84" + phone.substring(1);

        const confirmation = await signInWithPhoneNumber(
          auth,
          phone,
          recaptchaVerifierInstance,
        );
        setConfirmationResult(confirmation);
        showModal("Đã gửi mã OTP vào Số điện thoại của bạn!", "success");
      }
      setStep(2);
    } catch (error: any) {
      showModal(
        error.response?.data || "Không thể gửi mã OTP. Vui lòng thử lại!",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // BƯỚC 2: NHẬP OTP + MẬT KHẨU MỚI
  // ==========================================
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return showModal("Vui lòng nhập mã OTP!", "warning");
    if (newPassword.length < 6)
      return showModal("Mật khẩu mới phải có ít nhất 6 ký tự!", "warning");
    if (newPassword !== confirmPassword)
      return showModal("Mật khẩu xác nhận không khớp!", "warning");

    setLoading(true);
    try {
      if (isEmail) {
        // Email: BE tự verify OTP qua otpService
        await axiosClient.post("/auth/patient/set-password", {
          identifier: identifier.trim(),
          password: newPassword,
          otp,
        });
      } else {
        // SĐT: verify OTP qua Firebase ở Client trước, rồi mới gọi BE đổi MK
        if (confirmationResult) {
          await confirmationResult.confirm(otp);
        }
        await axiosClient.post("/auth/patient/set-password", {
          identifier: identifier.trim(),
          password: newPassword,
        });
      }

      showModal(
        "Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.",
        "success",
        () => navigate("/login"),
      );
    } catch (error: any) {
      showModal(
        error.response?.data?.message ||
          error.response?.data ||
          "Mã OTP không hợp lệ hoặc có lỗi xảy ra!",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.appContainer}>
      <div style={styles.card}>
        <h2 style={styles.appTitle}>QUÊN MẬT KHẨU</h2>

        {step === 1 && (
          <form
            onSubmit={handleSendOtp}
            style={{ display: "flex", flexDirection: "column" }}
          >
            <p style={styles.description}>
              Nhập Email hoặc Số điện thoại đã đăng ký để nhận mã xác thực đặt
              lại mật khẩu.
            </p>

            <label style={styles.infoLabel}>Email hoặc Số điện thoại *</label>
            <input
              style={styles.inputField}
              placeholder="VD: nguyenvan@gmail.com hoặc 0912345678"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />

            <button type="submit" disabled={loading} style={styles.btnPrimary}>
              {loading ? "ĐANG GỬI..." : "GỬI MÃ OTP"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form
            onSubmit={handleResetPassword}
            style={{ display: "flex", flexDirection: "column" }}
          >
            <div style={styles.alertBox}>
              Mã xác thực đã được gửi đến {isEmail ? "Email" : "Số điện thoại"}:{" "}
              <b>{identifier}</b>
            </div>

            <label style={styles.infoLabel}>Nhập mã OTP (6 số) *</label>
            <input
              style={styles.otpInputField}
              type="text"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            />

            <label style={styles.infoLabel}>Mật khẩu mới *</label>
            <input
              style={styles.inputField}
              type="password"
              placeholder="Ít nhất 6 ký tự"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <label style={styles.infoLabel}>Xác nhận mật khẩu mới *</label>
            <input
              style={styles.inputField}
              type="password"
              placeholder="Nhập lại mật khẩu mới"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <button type="submit" disabled={loading} style={styles.btnPrimary}>
              {loading ? "ĐANG XỬ LÝ..." : "ĐẶT LẠI MẬT KHẨU"}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              style={styles.btnSecondary}
            >
              ← Đổi Email/SĐT khác
            </button>
          </form>
        )}
      </div>

      <Modal
        {...modalConfig}
        onClose={() => {
          setModalConfig({ ...modalConfig, isOpen: false });
          if (modalConfig.onConfirm) modalConfig.onConfirm();
        }}
      />
      <div id="recaptcha-container-forgot"></div>
    </div>
  );
}

const styles = {
  appContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "calc(100vh - 70px)",
    backgroundColor: "var(--bg)",
    padding: "10px",
    boxSizing: "border-box",
    fontFamily: "'Segoe UI', Roboto, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "440px",
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    padding: "clamp(24px, 5vw, 35px) clamp(20px, 5vw, 30px)",
    boxShadow: "0 10px 25px -5px rgba(13, 148, 136, 0.1)",
    border: "1px solid #ccfbf1",
    boxSizing: "border-box",
  },
  appTitle: {
    fontSize: "clamp(20px, 5vw, 22px)",
    fontWeight: 800,
    color: "#0d9488",
    textAlign: "center",
    marginBottom: "12px",
  },
  description: {
    textAlign: "center",
    color: "#64748b",
    marginBottom: "20px",
    fontSize: "14px",
    lineHeight: "1.5",
  },
  infoLabel: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#334155",
    marginBottom: "6px",
    textTransform: "uppercase",
  },
  inputField: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    marginBottom: "12px",
    outline: "none",
    boxSizing: "border-box",
  },
  otpInputField: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "2px solid #0d9488",
    fontSize: "20px",
    color: "#0d9488",
    fontWeight: "bold",
    marginBottom: "15px",
    outline: "none",
    boxSizing: "border-box",
    textAlign: "center",
    letterSpacing: "6px",
  },
  btnPrimary: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#0d9488",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: "8px",
    boxShadow: "0 4px 12px rgba(13, 148, 136, 0.2)",
  },
  btnSecondary: {
    width: "100%",
    padding: "10px",
    backgroundColor: "transparent",
    color: "#64748b",
    border: "none",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "10px",
  },
  alertBox: {
    backgroundColor: "#ccfbf1",
    color: "#115e59",
    padding: "12px",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: 600,
    marginBottom: "16px",
    lineHeight: "1.4",
    border: "1px solid rgba(13, 148, 136, 0.15)",
  },
} as const;
