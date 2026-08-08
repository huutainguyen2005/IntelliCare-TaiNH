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
        await axiosClient.post("/auth/patient/set-password", {
          identifier: identifier.trim(),
          password: newPassword,
          otp,
        });
      } else {
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
    <div style={styles.pageBackground}>
      <div style={styles.card}>
        <div style={styles.eyebrow}>Bước {step}/2</div>
        <h1 style={styles.title}>Quên mật khẩu</h1>

        {step === 1 && (
          <form onSubmit={handleSendOtp}>
            <p style={styles.introText}>
              Nhập Email hoặc Số điện thoại đã đăng ký để nhận mã xác thực đặt
              lại mật khẩu.
            </p>

            <label style={styles.label}>Email hoặc Số điện thoại</label>
            <input
              style={styles.input}
              placeholder="VD: nguyenvan@gmail.com hoặc 0912345678"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />

            <button type="submit" disabled={loading} style={styles.btnPrimary}>
              {loading ? "Đang gửi…" : "Gửi mã OTP"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/login")}
              style={styles.btnSecondary}
            >
              ← Quay lại đăng nhập
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPassword}>
            <div style={styles.greetingBox}>
              Mã xác thực đã được gửi đến {isEmail ? "email" : "số điện thoại"}:{" "}
              <b>{identifier}</b>
            </div>

            <label style={styles.label}>Nhập mã OTP (6 số)</label>
            <input
              style={styles.otpInput}
              type="text"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            />

            <label style={styles.label}>Mật khẩu mới</label>
            <input
              style={styles.input}
              type="password"
              placeholder="Ít nhất 6 ký tự"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <label style={styles.label}>Xác nhận mật khẩu mới</label>
            <input
              style={styles.input}
              type="password"
              placeholder="Nhập lại mật khẩu mới"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <button type="submit" disabled={loading} style={styles.btnPrimary}>
              {loading ? "Đang xử lý…" : "Đặt lại mật khẩu"}
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

const COLORS = {
  ink: "#12211A",
  paper: "#F5F6F3",
  paperRaised: "#FFFFFF",
  safe: "#0B6E4F",
  muted: "#6B7268",
  hairline: "#D8DAD3",
};

const FONT_SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const styles = {
  pageBackground: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "calc(100vh - 70px)",
    background: COLORS.paper,
    padding: "20px",
    boxSizing: "border-box",
    fontFamily: FONT_SANS,
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: COLORS.paperRaised,
    borderRadius: "12px",
    border: `1px solid ${COLORS.hairline}`,
    padding: "clamp(28px, 5vw, 36px)",
    boxSizing: "border-box",
  },
  eyebrow: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: COLORS.muted,
    marginBottom: "8px",
    textAlign: "center",
  },
  title: {
    fontSize: "22px",
    fontWeight: 700,
    color: COLORS.ink,
    textAlign: "center",
    margin: "0 0 20px 0",
  },
  introText: {
    textAlign: "center",
    color: COLORS.muted,
    marginBottom: "24px",
    fontSize: "14px",
    lineHeight: "1.6",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    color: COLORS.muted,
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "8px",
    border: `1px solid ${COLORS.hairline}`,
    fontSize: "14px",
    marginBottom: "16px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: FONT_SANS,
    color: COLORS.ink,
    background: COLORS.paperRaised,
  },
  otpInput: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "8px",
    border: `2px solid ${COLORS.safe}`,
    fontSize: "22px",
    color: COLORS.safe,
    fontWeight: 700,
    marginBottom: "18px",
    outline: "none",
    boxSizing: "border-box",
    textAlign: "center",
    letterSpacing: "8px",
    fontFamily: FONT_SANS,
  },
  btnPrimary: {
    width: "100%",
    padding: "13px",
    background: COLORS.safe,
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "8px",
    fontFamily: FONT_SANS,
  },
  btnSecondary: {
    width: "100%",
    padding: "10px",
    background: "transparent",
    color: COLORS.muted,
    border: "none",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "10px",
    fontFamily: FONT_SANS,
  },
  greetingBox: {
    background: COLORS.paper,
    border: `1px solid ${COLORS.hairline}`,
    color: COLORS.ink,
    padding: "14px 16px",
    borderRadius: "8px",
    fontSize: "14px",
    marginBottom: "20px",
    lineHeight: "1.5",
  },
} as const;
