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

  // State quản lý luồng
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);

  // State dữ liệu
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

  // ==========================================
  // BƯỚC 1: XÁC MINH CCCD & NGÀY SINH (NHẬP TAY)
  // ==========================================
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
      setStep(2); // Chuyển sang bước nhập SĐT/Pass
    } catch (error: any) {
      showModal(
        error.response?.data ||
          "Không tìm thấy hồ sơ! Vui lòng kiểm tra lại CCCD và Ngày sinh.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // BƯỚC 2.1: GỬI OTP (EMAIL HOẶC SMS)
  // ==========================================
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 6)
      return showModal("Mật khẩu phải từ 6 ký tự!", "warning");
    if (formData.password !== formData.confirmPassword)
      return showModal("Mật khẩu xác nhận không khớp!", "warning");

    setLoading(true);
    try {
      // ƯU TIÊN 1: NẾU CÓ EMAIL -> GỬI OTP EMAIL
      if (formData.email && formData.email.trim() !== "") {
        await axiosClient.post("/auth/send-otp", { email: formData.email });
        setIsOtpSent(true);
        showModal("Đã gửi mã OTP vào Email của bạn!", "success");
      }
      // ƯU TIÊN 2: KHÔNG CÓ EMAIL -> GỬI OTP SMS FIREBASE
      else {
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
      showModal(error.response?.data || "Lỗi gửi mã OTP!", "error");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // BƯỚC 2.2: XÁC NHẬN OTP & KÍCH HOẠT
  // ==========================================
  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.otp) return showModal("Vui lòng nhập OTP!", "warning");
    setLoading(true);
    try {
      // Nếu là OTP SMS, cần verify qua Firebase trước khi gọi Backend
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
    <div style={styles.appContainer}>
      <div style={styles.card}>
        <h2 style={styles.appTitle}>KÍCH HOẠT HỒ SƠ Y TẾ</h2>

        {step === 1 && (
          <form
            onSubmit={handleVerify}
            style={{ display: "flex", flexDirection: "column" }}
          >
            <p
              style={{
                textAlign: "center",
                color: "#64748b",
                marginBottom: "25px",
                fontSize: "14px",
                lineHeight: "1.5",
              }}
            >
              Vui lòng điền thông tin CCCD đã sử dụng tại trạm đo để kích hoạt
              tài khoản của bạn.
            </p>

            <label style={styles.infoLabel}>Số CCCD *</label>
            <input
              style={styles.inputField}
              name="idCard"
              placeholder="Nhập số thẻ CCCD (12 số)"
              required
              value={formData.idCard}
              onChange={handleChange}
            />

            <label style={styles.infoLabel}>Ngày sinh *</label>
            <input
              style={styles.inputField}
              name="dob"
              type="date"
              required
              value={formData.dob}
              onChange={handleChange}
            />

            <button type="submit" disabled={loading} style={styles.btnPrimary}>
              {loading ? "ĐANG TÌM KIẾM..." : "TÌM HỒ SƠ"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form
            onSubmit={!isOtpSent ? handleSendOtp : handleActivate}
            style={{ display: "flex", flexDirection: "column" }}
          >
            <div style={styles.alertBox}>
              Xin chào <b>{patientInfo.fullName}</b>! Vui lòng thiết lập thông
              tin bảo mật cho hồ sơ của bạn.
            </div>

            {!isOtpSent ? (
              <>
                <label style={styles.infoLabel}>Số điện thoại chính *</label>
                <input
                  style={styles.inputField}
                  name="phoneNumber"
                  placeholder="VD: 0912345678"
                  required
                  value={formData.phoneNumber}
                  onChange={handleChange}
                />

                <label style={styles.infoLabel}>
                  Email (Tùy chọn - Nhận mã OTP nhanh hơn)
                </label>
                <input
                  style={styles.inputField}
                  name="email"
                  type="email"
                  placeholder="VD: nguyenvan@gmail.com"
                  value={formData.email}
                  onChange={handleChange}
                />

                <label style={styles.infoLabel}>Mật khẩu mới *</label>
                <input
                  style={styles.inputField}
                  name="password"
                  type="password"
                  placeholder="Ít nhất 6 ký tự"
                  required
                  value={formData.password}
                  onChange={handleChange}
                />

                <label style={styles.infoLabel}>Xác nhận mật khẩu *</label>
                <input
                  style={styles.inputField}
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
                  {loading ? "ĐANG XỬ LÝ..." : "NHẬN MÃ KÍCH HOẠT"}
                </button>
              </>
            ) : (
              <>
                <label style={styles.infoLabel}>Nhập mã OTP (6 số) *</label>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#64748b",
                    marginBottom: "15px",
                    marginTop: "-5px",
                  }}
                >
                  Mã xác thực đã được gửi đến{" "}
                  {formData.email ? "Email" : "Số điện thoại"} của bạn.
                </p>
                <input
                  style={styles.otpInputField}
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
                  {loading ? "ĐANG XÁC THỰC..." : "HOÀN TẤT KÍCH HOẠT"}
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

const styles = {
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
    maxWidth: "480px",
    backgroundColor: "#ffffff",
    borderRadius: "24px",
    padding: "40px 35px",
    boxShadow: "0 10px 25px -5px rgba(13, 148, 136, 0.1)",
    border: "1px solid #ccfbf1",
  },
  appTitle: {
    fontSize: "22px",
    fontWeight: 800,
    color: "#0d9488",
    textAlign: "center",
    marginBottom: "20px",
  },
  infoLabel: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#334155",
    marginBottom: "8px",
    textTransform: "uppercase",
  },
  inputField: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    marginBottom: "20px",
    outline: "none",
    boxSizing: "border-box",
  },
  otpInputField: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "12px",
    border: "2px solid #0d9488",
    fontSize: "22px",
    color: "#0d9488",
    fontWeight: "bold",
    marginBottom: "25px",
    outline: "none",
    boxSizing: "border-box",
    textAlign: "center",
    letterSpacing: "8px",
  },
  btnPrimary: {
    width: "100%",
    padding: "14px",
    backgroundColor: "#0d9488",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(13, 148, 136, 0.2)",
  },
  alertBox: {
    backgroundColor: "#ccfbf1",
    color: "#115e59",
    padding: "14px",
    borderRadius: "14px",
    fontSize: "14px",
    fontWeight: 600,
    marginBottom: "20px",
    lineHeight: "1.5",
    border: "1px solid rgba(13, 148, 136, 0.15)",
  },
} as const;
