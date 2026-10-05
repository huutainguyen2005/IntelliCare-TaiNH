import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import Logo from "../components/Logo";
import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  normalizeEmail,
  normalizeName,
  validateEmail,
  validateFullName,
} from "../utils/validators";

// Chỉ có đúng 1 trạm cân duy nhất cho sự kiện Workshop - khớp đúng
// DEVICE_ID trong config.h firmware (chế độ WORKSHOP_MODE).
const WORKSHOP_DEVICE_ID = "WORKSHOP_SCALE_01";

export default function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ fullName: "", email: "" });

  const inputBase =
    "w-full rounded-lg border bg-paper-raised px-3.5 py-3 text-base text-ink outline-none transition placeholder:text-muted/70 focus:ring-2";
  const inputClass = (hasError: boolean) =>
    `${inputBase} ${
      hasError
        ? "border-risk focus:border-risk focus:ring-risk/10"
        : "border-hairline focus:border-safe focus:ring-safe/10"
    }`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const errors = {
      fullName: validateFullName(fullName),
      email: validateEmail(email),
    };
    setFieldErrors(errors);
    if (errors.fullName || errors.email) return;

    setLoading(true);

    try {
      const res = await axiosClient.post("/api/workshop/register", {
        fullName: normalizeName(fullName),
        email: normalizeEmail(email),
        deviceId: WORKSHOP_DEVICE_ID,
      });
      navigate(`/session/${res.data.sessionId}`);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại!",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-dvh w-full items-center justify-center bg-paper px-4 py-6 sm:px-6 sm:py-10">
      <section className="w-full max-w-[420px] rounded-xl border border-hairline bg-paper-raised p-5 min-[400px]:p-7 sm:p-9 md:max-w-[480px]">
        <div className="mb-4">
          <Logo />
        </div>

        <div className="mb-2 text-center text-xs font-bold uppercase tracking-[0.08em] text-muted">
          IntelliCare Workshop
        </div>

        <h1 className="mb-3 text-center text-2xl font-bold text-ink sm:text-[26px]">
          Đo sức khỏe miễn phí
        </h1>

        <p className="mb-6 text-center text-sm leading-6 text-muted">
          Điền thông tin để nhận kết quả đo (cân nặng, chiều cao, BMI) gửi thẳng
          vào email của bạn.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label
              htmlFor="fullName"
              className="mb-1.5 block text-[13px] font-semibold text-muted"
            >
              Họ và tên
            </label>
            <input
              id="fullName"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (fieldErrors.fullName) {
                  setFieldErrors((prev) => ({ ...prev, fullName: "" }));
                }
              }}
              onBlur={() =>
                setFieldErrors((prev) => ({
                  ...prev,
                  fullName: validateFullName(fullName),
                }))
              }
              required
              maxLength={NAME_MAX_LENGTH}
              placeholder="VD: Nguyễn Văn A"
              autoComplete="name"
              aria-invalid={!!fieldErrors.fullName}
              aria-describedby={
                fieldErrors.fullName ? "fullName-error" : undefined
              }
              className={inputClass(!!fieldErrors.fullName)}
            />
            {fieldErrors.fullName && (
              <p
                id="fullName-error"
                role="alert"
                className="mt-1.5 text-[13px] leading-5 text-risk"
              >
                {fieldErrors.fullName}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-[13px] font-semibold text-muted"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="VD: nguyenvana@gmail.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: "" }));
                }
              }}
              onBlur={() =>
                setFieldErrors((prev) => ({
                  ...prev,
                  email: validateEmail(email),
                }))
              }
              required
              maxLength={EMAIL_MAX_LENGTH}
              autoComplete="email"
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
              className={inputClass(!!fieldErrors.email)}
            />
            {fieldErrors.email && (
              <p
                id="email-error"
                role="alert"
                className="mt-1.5 text-[13px] leading-5 text-risk"
              >
                {fieldErrors.email}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 min-h-12 w-full rounded-lg bg-safe px-4 py-3.5 text-base font-bold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-safe/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Đang xử lý…" : "Tiếp tục"}
          </button>
        </form>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-hairline bg-paper px-3 py-3 text-center text-sm leading-5 text-risk"
          >
            {error}
          </div>
        )}
      </section>
    </main>
  );
}
