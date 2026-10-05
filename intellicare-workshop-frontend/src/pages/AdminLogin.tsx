import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { useAdminAuth } from "../context/AdminAuthContext";
import { Icon } from "react-icons-kit";
import { eyeOff } from "react-icons-kit/feather/eyeOff";
import { eye } from "react-icons-kit/feather/eye";

export default function AdminLogin() {
  const { isAuthenticated, login } = useAdminAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axiosClient.post("/auth/admin/login", {
        username: username.trim(),
        password,
      });
      login(res.data.token, res.data.username);
      navigate("/admin/dashboard");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Tài khoản hoặc mật khẩu không đúng!",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-paper px-4 py-6 sm:px-6 sm:py-10">
      <section className="w-full max-w-[380px] rounded-xl border border-hairline bg-paper-raised p-7 sm:p-9">
        <div className="mb-2 text-center text-xs font-bold uppercase tracking-[0.08em] text-muted">
          Quản trị
        </div>

        <h1 className="mb-6 text-center text-[22px] font-bold text-ink sm:text-2xl">
          Đăng nhập Admin
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="mb-1.5 block text-[13px] font-semibold text-muted"
            >
              Tài khoản
            </label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full rounded-lg border border-hairline bg-paper-raised px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-safe focus:ring-2 focus:ring-safe/10"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-[13px] font-semibold text-muted"
            >
              Mật khẩu
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-hairline bg-paper-raised px-3.5 py-3 pr-11 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-safe focus:ring-2 focus:ring-safe/10"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-ink"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                <Icon icon={showPassword ? eyeOff : eye} size={18} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 min-h-11 w-full rounded-lg bg-safe px-4 py-3 text-[15px] font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-safe/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Đang đăng nhập…" : "Đăng nhập"}
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
