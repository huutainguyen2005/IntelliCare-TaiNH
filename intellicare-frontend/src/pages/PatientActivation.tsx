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

export default function PatientActivation() {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);

  const [patientInfo, setPatientInfo] = useState({
    fullName: "",
    patientCode: "",
  });
  const [formData, setFormData] = useState({
    idCard: "",
    dob: "",
    phoneNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
    otp: "",
  });

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    message: "",
    type: "warning" as "success" | "error" | "warning",
    onConfirm: undefined as any,
  });
  const showModal = (
    message: string,
    type: "success" | "error" | "warning",
    onConfirm?: () => void,
  ) => setModalConfig({ isOpen: true, message, type, onConfirm });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axiosClient.post("/auth/patient/verify-activation", {
        idCard: formData.idCard,
        dob: formData.dob,
      });
      setPatientInfo({
        fullName: res.data.fullName,
        patientCode: res.data.patientCode,
      });
      setStep(2);
    } catch (error: any) {
      const backendMsg: string =
        error.response?.data ||
        "Không tìm thấy hồ sơ! Vui lòng kiểm tra lại CCCD và Ngày sinh.";

      const alreadyActivated =
        typeof backendMsg === "string" &&
        backendMsg.includes("đã được kích hoạt");

      showModal(
        backendMsg,
        "error",
        alreadyActivated ? () => navigate("/login") : undefined,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 6)
      return showModal("Mật khẩu phải từ 6 ký tự!", "warning");
    if (formData.password !== formData.confirmPassword)
      return showModal("Mật khẩu xác nhận không khớp!", "warning");

    setLoading(true);
    try {
      if (formData.email && formData.email.trim() !== "") {
        await axiosClient.post("/auth/send-otp", { email: formData.email });
        setIsOtpSent(true);
        showModal("Đã gửi mã OTP vào Email của bạn!", "success");
      } else {
        if (!recaptchaVerifierInstance) {
          recaptchaVerifierInstance = new RecaptchaVerifier(
            auth,
            "recaptcha-container",
            { size: "invisible" },
          );
        }
        let phone = formData.phoneNumber.trim();
        if (phone.startsWith("0")) phone = "+84" + phone.substring(1);

        const confirmation = await signInWithPhoneNumber(
          auth,
          phone,
          recaptchaVerifierInstance,
        );
        setConfirmationResult(confirmation);
        setIsOtpSent(true);
        showModal("Đã gửi mã OTP vào Số điện thoại!", "success");
      }
    } catch (error: any) {
      const data = error.response?.data;
      const message = typeof data === "string" ? data : data?.message;
      showModal(message || "Lỗi gửi mã OTP!", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.otp) return showModal("Vui lòng nhập OTP!", "warning");
    setLoading(true);
    try {
      if (!formData.email && confirmationResult) {
        await confirmationResult.confirm(formData.otp);
      }

      await axiosClient.post("/auth/patient/activate", formData);
      showModal("Kích hoạt thành công! Vui lòng đăng nhập.", "success", () =>
        navigate("/login"),
      );
    } catch (error: any) {
      showModal(
        error.response?.data || "OTP không hợp lệ hoặc kích hoạt thất bại!",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageBackground}>
      <div style={styles.card}>
        <div style={styles.eyebrow}>Bước {step === 1 ? "1" : "2"}/2</div>
        <h1 style={styles.title}>Kích hoạt hồ sơ y tế</h1>

        {step === 1 && (
          <form onSubmit={handleVerify}>
            <p style={styles.introText}>
              Điền thông tin CCCD đã sử dụng tại trạm đo để kích hoạt tài khoản
              của bạn.
            </p>

            <label style={styles.label}>Số CCCD</label>
            <input
              style={styles.input}
              name="idCard"
              placeholder="Nhập số thẻ CCCD (12 số)"
              required
              value={formData.idCard}
              onChange={handleChange}
            />

            <label style={styles.label}>Ngày sinh</label>
            <input
              style={styles.input}
              name="dob"
              type="date"
              required
              value={formData.dob}
              onChange={handleChange}
            />

            <button type="submit" disabled={loading} style={styles.btnPrimary}>
              {loading ? "Đang tìm kiếm…" : "Tìm hồ sơ"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={!isOtpSent ? handleSendOtp : handleActivate}>
            <div style={styles.greetingBox}>
              Xin chào <b>{patientInfo.fullName}</b>. Vui lòng thiết lập thông
              tin bảo mật cho hồ sơ của bạn.
            </div>

            {!isOtpSent ? (
              <>
                <label style={styles.label}>Số điện thoại chính</label>
                <input
                  style={styles.input}
                  name="phoneNumber"
                  placeholder="VD: 0912345678"
                  required
                  value={formData.phoneNumber}
                  onChange={handleChange}
                />

                <label style={styles.label}>
                  Email (tùy chọn — nhận mã OTP nhanh hơn)
                </label>
                <input
                  style={styles.input}
                  name="email"
                  type="email"
                  placeholder="VD: nguyenvan@gmail.com"
                  value={formData.email}
                  onChange={handleChange}
                />

                <label style={styles.label}>Mật khẩu mới</label>
                <input
                  style={styles.input}
                  name="password"
                  type="password"
                  placeholder="Ít nhất 6 ký tự"
                  required
                  value={formData.password}
                  onChange={handleChange}
                />

                <label style={styles.label}>Xác nhận mật khẩu</label>
                <input
                  style={styles.input}
                  name="confirmPassword"
                  type="password"
                  placeholder="Nhập lại mật khẩu"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />

                <button
                  type="submit"
                  disabled={loading}
                  style={styles.btnPrimary}
                >
                  {loading ? "Đang xử lý…" : "Nhận mã kích hoạt"}
                </button>
              </>
            ) : (
              <>
                <label style={styles.label}>Nhập mã OTP (6 số)</label>
                <p style={styles.otpHint}>
                  Mã xác thực đã được gửi đến{" "}
                  {formData.email ? "email" : "số điện thoại"} của bạn.
                </p>
                <input
                  style={styles.otpInput}
                  name="otp"
                  type="text"
                  maxLength={6}
                  required
                  value={formData.otp}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      otp: e.target.value.replace(/\D/g, ""),
                    })
                  }
                />

                <button
                  type="submit"
                  disabled={loading}
                  style={styles.btnPrimary}
                >
                  {loading ? "Đang xác thực…" : "Hoàn tất kích hoạt"}
                </button>
              </>
            )}
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
      <div id="recaptcha-container"></div>
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
    maxWidth: "440px",
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
  otpHint: {
    fontSize: "13px",
    color: COLORS.muted,
    marginBottom: "16px",
    marginTop: "-4px",
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
