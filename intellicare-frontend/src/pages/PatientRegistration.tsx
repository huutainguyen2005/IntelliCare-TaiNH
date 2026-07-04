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
  const [formData, setFormData] = useState({
    fullName: "",
    identifier: "", // Nhập được cả SĐT hoặc Email
    dob: "",
    gender: "Nam",
  });
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
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

  // Hàm kiểm tra xem chuỗi nhập vào là Email hay Số điện thoại
  const isEmailFormat = (val: string) => {
    return val.includes("@");
  };

  // Hàm định dạng số điện thoại sang chuẩn quốc tế (+84) cho Firebase
  const formatPhoneNumber = (phone: string) => {
    let formatted = phone.trim();
    if (formatted.startsWith("0")) {
      formatted = "+84" + formatted.slice(1);
    }
    return formatted;
  };

  // HÀM 1: KIỂM TRA TRÙNG LẶP & GỬI MÃ OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    const inputIdentifier = formData.identifier.trim();
    const nameWords = formData.fullName.trim().split(/\s+/);

    // 1. Validation định dạng dữ liệu ở Frontend trước
    if (nameWords.length < 2) {
      return showModal(
        "Vui lòng nhập ít nhất 2 từ (VD: Nguyễn An)!",
        "warning",
      );
    }
    if (
      !isEmailFormat(inputIdentifier) &&
      !inputIdentifier.match(/(0[3|5|7|8|9])+([0-9]{8})\b/)
    ) {
      return showModal(
        "Số điện thoại không đúng định dạng Việt Nam!",
        "warning",
      );
    }

    setLoading(true);

    // 2. GỌI API BACKEND KIỂM TRA TRÙNG TÀI KHOẢN TRƯỚC KHI GỬI OTP
    try {
      await axiosClient.get(
        `/auth/check-duplicate?identifier=${encodeURIComponent(inputIdentifier)}`,
      );
    } catch (error: any) {
      console.error("Lỗi trùng lặp dữ liệu tài khoản:", error);
      let errorMsg = "Thông tin liên hệ (SĐT/Email) này đã được sử dụng!";
      if (error.response?.status === 409) {
        errorMsg =
          typeof error.response.data === "string"
            ? error.response.data
            : error.response.data.message || errorMsg;
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      }
      setLoading(false);
      return showModal(errorMsg, "warning"); // Kết thúc hàm luôn, KHÔNG kích hoạt gửi OTP
    }

    // 3. TIẾN HÀNH GỬI OTP KHI THÔNG TIN HỢP LỆ
    if (isEmailFormat(inputIdentifier)) {
      // === CHẾ ĐỘ 1: GỬI OTP QUA EMAIL (Spring Boot SMTP) ===
      try {
        await axiosClient.post("/auth/send-otp", { email: inputIdentifier });

        setIsOtpSent(true);
        setConfirmationResult(null); // Không dùng Firebase cho luồng Email
        showModal(
          "Mã OTP đã được gửi tới Email của bạn! Vui lòng kiểm tra hộp thư.",
          "success",
        );
      } catch (error: any) {
        console.error(error);
        let errorMsg =
          "Không thể gửi OTP qua Email. Vui lòng kiểm tra lại hệ thống!";
        if (error.response?.data) {
          errorMsg =
            typeof error.response.data === "string"
              ? error.response.data
              : error.response.data.message || errorMsg;
        }
        showModal(errorMsg, "error");
      } finally {
        setLoading(false);
      }
    } else {
      // === CHẾ ĐỘ 2: GỬI OTP QUA SỐ ĐIỆN THOẠI (Firebase SMS) ===
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

        const globalPhone = formatPhoneNumber(inputIdentifier);
        const confirmation = await signInWithPhoneNumber(
          auth,
          globalPhone,
          recaptchaVerifierInstance,
        );

        setConfirmationResult(confirmation);
        setIsOtpSent(true);
        showModal("Mã OTP đã được gửi về số điện thoại của bạn!", "success");
      } catch (error) {
        console.error(error);
        showModal(
          "Không thể gửi OTP SMS. Vui lòng kiểm tra lại cấu hình mạng hoặc Firebase!",
          "error",
        );
        if (recaptchaVerifierInstance) {
          recaptchaVerifierInstance.clear();
          recaptchaVerifierInstance = null;
        }
      } finally {
        setLoading(false);
      }
    }
  };

  // HÀM 2: XÁC THỰC MÃ OTP + ĐĂNG KÝ TÀI KHOẢN XUỐNG DATABASE
  const handleVerifyOtpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return showModal("Vui lòng nhập mã OTP!", "warning");

    setLoading(true);
    try {
      const inputIdentifier = formData.identifier.trim();

      // 1. Nếu là Số điện thoại -> Xác thực mã trên Firebase Client trước
      if (!isEmailFormat(inputIdentifier)) {
        if (!confirmationResult) {
          return showModal(
            "Hệ thống xác thực chưa sẵn sàng, vui lòng gửi lại mã!",
            "error",
          );
        }
        await confirmationResult.confirm(otp);
      }

      // 2. Gửi gói tin Payload sang API Backend Spring Boot để hoàn tất lưu DB
      const payload = {
        fullName: formData.fullName.trim(),
        identifier: inputIdentifier,
        dob: formData.dob,
        gender: formData.gender,
        otp: otp, // Gửi kèm OTP để Backend tự verify nếu người dùng chọn luồng Email
      };

      await axiosClient.post("/auth/register", payload);

      showModal("Đăng ký tài khoản bệnh nhân thành công!", "success", () => {
        navigate(`/login`);
      });
    } catch (error: any) {
      console.error(error);
      let errorMsg =
        "Mã OTP không chính xác hoặc tài khoản đã tồn tại trên hệ thống!";
      if (error.response?.data) {
        errorMsg =
          typeof error.response.data === "string"
            ? error.response.data
            : error.response.data.message || errorMsg;
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
              <label style={styles.infoLabel}>Họ và tên</label>
              <input
                style={styles.inputField}
                name="fullName"
                value={formData.fullName}
                placeholder="VD: Nguyễn Văn An"
                required
                onChange={handleChange}
              />

              <label style={styles.infoLabel}>Số điện thoại hoặc Email</label>
              <input
                style={styles.inputField}
                name="identifier"
                value={formData.identifier}
                placeholder="Nhập SĐT hoặc Email của bạn..."
                required
                onChange={handleChange}
              />

              <label style={styles.infoLabel}>Ngày sinh</label>
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

              <label style={styles.infoLabel}>Giới tính</label>
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
              <div style={{ textAlign: "center", marginBottom: "25px" }}>
                <p
                  style={{
                    color: "#475569",
                    fontSize: "15px",
                    lineHeight: "1.6",
                  }}
                >
                  Mã xác thực OTP đã được gửi tới địa chỉ: <br />
                  <b
                    style={{
                      color: "#0d9488",
                      fontSize: "18px",
                      wordBreak: "break-all",
                    }}
                  >
                    {formData.identifier}
                  </b>
                </p>
                <button
                  type="button"
                  onClick={() => setIsOtpSent(false)}
                  style={styles.btnLink}
                >
                  Thay đổi thông tin kết nối khác?
                </button>
              </div>

              <label style={styles.infoLabel}>Nhập mã OTP (6 số)</label>
              <input
                style={styles.otpInputField}
                type="text"
                maxLength={6}
                placeholder="******"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              />

              <button
                type="submit"
                disabled={loading}
                style={styles.btnPrimary}
              >
                {loading ? "ĐANG XÁC MINH..." : "XÁC NHẬN & TIẾN HÀNH ĐO CÂN"}
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

// HỆ THỐNG PHONG CÁCH MÀU XANH NGỌC ĐỒNG NHẤT HỆ THỐNG
const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "calc(100vh - 80px)",
    backgroundColor: "#f0fdfa", // Nền xanh ngọc nhạt dịu mắt
    padding: "20px",
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "480px",
    backgroundColor: "#ffffff",
    borderRadius: "24px", // Bo tròn mịn màng đồng nhất Profile
    padding: "40px 35px",
    boxShadow:
      "0 10px 25px -5px rgba(13, 148, 136, 0.1), 0 8px 10px -6px rgba(13, 148, 136, 0.1)", // Shadow ám xanh ngọc nhẹ công nghệ
    border: "1px solid #ccfbf1",
  },
  appTitle: {
    fontSize: "24px",
    fontWeight: 800,
    color: "#0d9488", // Chuẩn xanh ngọc đậm IntelliCare
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
    backgroundColor: "#0d9488", // Nền nút xanh ngọc thương hiệu
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
