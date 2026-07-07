import { useState } from "react";
import axiosClient from "../api/axiosClient";
import { useNavigate } from "react-router-dom";
import Modal from "../components/Modal";
import { auth } from "../api/firebaseConfig";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import type { ConfirmationResult } from "firebase/auth";

// Sử dụng duy nhất một biến instance nằm ngoài Component để tránh bị re-render làm nhiễu Recaptcha
let recaptchaVerifierInstance: RecaptchaVerifier | null = null;

export default function PatientRegistration() {
  const navigate = useNavigate();

  // 1. TÁCH STATE CHO PHONE, EMAIL VÀ THÊM PASSWORD
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "", // Bắt buộc
    email: "", // Tùy chọn
    dob: "",
    gender: "Nam",
    password: "", // Mật khẩu người dùng tự đặt
  });

  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [sentTo, setSentTo] = useState(""); // Lưu lại đích đến để hiển thị thông báo
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "warning";
    onConfirm?: () => void;
  }>({ isOpen: false, message: "", type: "warning" });

  const today = new Date().toISOString().split("T")[0];

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isEmailFormat = (val: string) => {
    return val.includes("@");
  };

  const formatPhoneNumberForFirebase = (phone: string) => {
    let formatted = phone.trim();
    if (formatted.startsWith("0")) {
      formatted = formatted.substring(1);
    }
    return "+84" + formatted;
  };

  // HÀM 1: KIỂM TRA TRÙNG LẶP & GỬI MÃ OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    const inputPhone = formData.phoneNumber.trim();
    const inputEmail = formData.email.trim();
    const nameWords = formData.fullName.trim().split(/\s+/);

    // 1. Validation Frontend
    if (nameWords.length < 2) {
      return showModal("Vui lòng nhập ít nhất 2 từ cho Họ và tên!", "warning");
    }

    // Tối ưu Regex kiểm tra SĐT Việt Nam
    if (!inputPhone.match(/^0(3[2-9]|5[25689]|7[06789]|8[1-9]|9\d)\d{7}$/)) {
      return showModal("Số điện thoại không đúng định dạng!", "warning");
    }
    if (inputEmail && !isEmailFormat(inputEmail)) {
      return showModal("Định dạng Email không hợp lệ!", "warning");
    }

    setLoading(true);

    // 2. GỌI API BACKEND KIỂM TRA TRÙNG LẶP
    try {
      const params = new URLSearchParams();
      params.append("phoneNumber", inputPhone);
      if (inputEmail) {
        params.append("email", inputEmail);
      }
      await axiosClient.get(`/auth/check-duplicate?${params.toString()}`);
    } catch (error: any) {
      console.error("Lỗi trùng lặp dữ liệu:", error);
      let errorMsg = "Thông tin liên hệ này đã được sử dụng!";
      if (error.response?.data) {
        errorMsg =
          typeof error.response.data === "string"
            ? error.response.data
            : error.response.data.message || errorMsg;
      }
      setLoading(false);
      return showModal(errorMsg, "warning");
    }

    // 3. LOGIC GỬI OTP (ƯU TIÊN EMAIL -> FIREBASE SMS)
    if (inputEmail) {
      // === CHẾ ĐỘ 1: GỬI QUA EMAIL ===
      try {
        await axiosClient.post("/auth/send-otp", { email: inputEmail });
        setIsOtpSent(true);
        setConfirmationResult(null);
        setSentTo(inputEmail);
        showModal("Mã OTP đã được gửi tới Email của bạn!", "success");
      } catch (error: any) {
        console.error(error);
        showModal(
          "Không thể gửi OTP qua Email, vui lòng kiểm tra lại!",
          "error",
        );
      } finally {
        setLoading(false);
      }
    } else {
      // === CHẾ ĐỘ 2: GỬI QUA SỐ ĐIỆN THOẠI (FIREBASE) ===
      try {
        if (!recaptchaVerifierInstance) {
          recaptchaVerifierInstance = new RecaptchaVerifier(
            auth,
            "recaptcha-container",
            {
              size: "invisible",
              "expired-callback": () => {
                if (recaptchaVerifierInstance) {
                  recaptchaVerifierInstance.clear();
                  recaptchaVerifierInstance = null;
                }
              },
            },
          );
        }

        const globalPhone = formatPhoneNumberForFirebase(inputPhone);
        const confirmation = await signInWithPhoneNumber(
          auth,
          globalPhone,
          recaptchaVerifierInstance,
        );

        setConfirmationResult(confirmation);
        setIsOtpSent(true);
        setSentTo(inputPhone);
        showModal("Mã OTP đã được gửi về Số điện thoại của bạn!", "success");
      } catch (error) {
        console.error(error);
        showModal("Không thể gửi OTP SMS. Vui lòng kiểm tra lại!", "error");
        if (recaptchaVerifierInstance) {
          recaptchaVerifierInstance.clear();
          recaptchaVerifierInstance = null;
        }
      } finally {
        setLoading(false);
      }
    }
  };

  // HÀM 2: XÁC THỰC MÃ OTP + ĐĂNG KÝ
  const handleVerifyOtpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return showModal("Vui lòng nhập mã OTP!", "warning");

    // Validate Mật khẩu mới được nhập ở Bước 2
    if (!formData.password.trim()) {
      return showModal("Vui lòng thiết lập mật khẩu!", "warning");
    }
    if (formData.password.length < 6) {
      return showModal("Mật khẩu phải có ít nhất 6 ký tự!", "warning");
    }

    setLoading(true);
    try {
      const inputPhone = formData.phoneNumber.trim();
      const inputEmail = formData.email.trim();

      // 1. Xác thực Firebase nếu không có Email
      if (!inputEmail) {
        if (!confirmationResult) {
          return showModal("Phiên xác thực lỗi, vui lòng gửi lại mã!", "error");
        }
        await confirmationResult.confirm(otp);
      }

      // 2. Gom Payload đủ cả Phone, Email và Mật khẩu gửi xuống Backend
      const payload = {
        fullName: formData.fullName.trim(),
        phoneNumber: inputPhone,
        email: inputEmail || null, // Truyền null nếu rỗng để Backend dễ xử lý
        dob: formData.dob,
        gender: formData.gender,
        password: formData.password, // Gửi mật khẩu xuống Spring Boot
        otp: otp,
      };

      await axiosClient.post("/auth/patient/register", payload);

      showModal("Đăng ký tài khoản bệnh nhân thành công!", "success", () => {
        navigate(`/login`);
      });
    } catch (error: any) {
      console.error(error);
      let errorMsg = "Lỗi khi đăng ký tài khoản!";
      if (error.response?.data) {
        // Backend có thể trả về lỗi Validation (mã 400), bắt để hiển thị rõ
        errorMsg =
          typeof error.response.data === "string"
            ? error.response.data
            : error.response.data.message || errorMsg;
      } else if (error.code === "auth/invalid-verification-code") {
        errorMsg = "Mã OTP không chính xác!";
      } else if (error.code === "auth/code-expired") {
        errorMsg = "Mã OTP đã hết hạn, vui lòng gửi lại!";
      }
      showModal(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.appContainer}>
      <div style={styles.card}>
        <h2 style={styles.appTitle}>ĐĂNG KÝ TÀI KHOẢN</h2>

        <form
          onSubmit={!isOtpSent ? handleSendOtp : handleVerifyOtpAndRegister}
          style={{ display: "flex", flexDirection: "column" }}
        >
          {!isOtpSent ? (
            <>
              {/* --- BƯỚC 1: NHẬP THÔNG TIN CÁ NHÂN --- */}
              <label style={styles.infoLabel}>Họ và tên *</label>
              <input
                style={styles.inputField}
                name="fullName"
                value={formData.fullName}
                placeholder="VD: Nguyễn Văn An"
                required
                onChange={handleChange}
              />

              <label style={styles.infoLabel}>Số điện thoại *</label>
              <input
                style={styles.inputField}
                name="phoneNumber"
                value={formData.phoneNumber}
                placeholder="Nhập số điện thoại (Bắt buộc)"
                required
                onChange={handleChange}
              />

              <label style={styles.infoLabel}>Email (Tùy chọn)</label>
              <input
                style={styles.inputField}
                name="email"
                value={formData.email}
                placeholder="Nhập Email để nhận mã ưu tiên"
                onChange={handleChange}
              />

              <label style={styles.infoLabel}>Ngày sinh *</label>
              <input
                style={styles.inputField}
                name="dob"
                type="date"
                value={formData.dob}
                required
                min="1900-01-01"
                max={today}
                onChange={handleChange}
              />

              <label style={styles.infoLabel}>Giới tính *</label>
              <select
                style={styles.inputField}
                name="gender"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>

              <button
                type="submit"
                disabled={loading}
                style={styles.btnPrimary}
              >
                {loading ? "ĐANG XỬ LÝ..." : "GỬI MÃ XÁC THỰC OTP"}
              </button>
            </>
          ) : (
            <>
              {/* --- BƯỚC 2: XÁC THỰC OTP & NHẬP MẬT KHẨU --- */}
              <div style={{ textAlign: "center", marginBottom: "25px" }}>
                <p
                  style={{
                    color: "#475569",
                    fontSize: "15px",
                    lineHeight: "1.6",
                  }}
                >
                  Mã xác thực OTP đã được gửi tới: <br />
                  <b
                    style={{
                      color: "#0d9488",
                      fontSize: "18px",
                      wordBreak: "break-all",
                    }}
                  >
                    {sentTo}
                  </b>
                </p>
                <button
                  type="button"
                  onClick={() => setIsOtpSent(false)}
                  style={styles.btnLink}
                >
                  Thay đổi thông tin?
                </button>
              </div>

              <label style={styles.infoLabel}>Nhập mã OTP (6 số) *</label>
              <input
                style={styles.otpInputField}
                type="text"
                maxLength={6}
                placeholder="******"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              />

              {/* Ô NHẬP MẬT KHẨU NẰM Ở ĐÂY */}
              <label style={styles.infoLabel}>Tạo mật khẩu đăng nhập *</label>
              <input
                style={styles.inputField}
                name="password"
                type="password"
                value={formData.password}
                placeholder="Nhập mật khẩu (Ít nhất 6 ký tự)"
                required
                onChange={handleChange}
              />

              <button
                type="submit"
                disabled={loading}
                style={styles.btnPrimary}
              >
                {loading ? "ĐANG XÁC MINH..." : "XÁC NHẬN ĐĂNG KÝ"}
              </button>
            </>
          )}
        </form>
      </div>

      <Modal
        isOpen={modalConfig.isOpen}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={handleCloseModal}
      />
      <div id="recaptcha-container"></div>
    </div>
  );
}

// BỘ STYLE MÀU XANH NGỌC GIỮ NGUYÊN BÊN DƯỚI
const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "calc(100vh - 80px)",
    backgroundColor: "#f0fdfa",
    padding: "20px",
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "480px",
    backgroundColor: "#ffffff",
    borderRadius: "24px",
    padding: "40px 35px",
    boxShadow:
      "0 10px 25px -5px rgba(13, 148, 136, 0.1), 0 8px 10px -6px rgba(13, 148, 136, 0.1)",
    border: "1px solid #ccfbf1",
  },
  appTitle: {
    fontSize: "24px",
    fontWeight: 800,
    color: "#0d9488",
    textAlign: "center",
    marginBottom: "30px",
    letterSpacing: "0.5px",
  },
  infoLabel: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#334155",
    marginBottom: "8px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  inputField: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    color: "#1e293b",
    marginBottom: "20px",
    outline: "none",
    backgroundColor: "#f8fafc",
    boxSizing: "border-box",
    transition: "all 0.2s ease",
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
    backgroundColor: "#f0fdfa",
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
    marginTop: "10px",
    transition: "background-color 0.2s ease",
  },
  btnLink: {
    color: "#0284c7",
    background: "none",
    border: "none",
    cursor: "pointer",
    textDecoration: "underline",
    fontSize: "14px",
    marginTop: "8px",
    fontWeight: 500,
  },
};
