import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { useAdminAuth } from "../context/AdminAuthContext";
import Logo from "../components/Logo";

interface DashboardStats {
  totalParticipants: number;
  completedCount: number;
  pendingCount: number;
  avgWeightKg: number | null;
  avgHeightCm: number | null;
  avgBmi: number | null;
}

interface CurrentMeasuring {
  sessionId: string;
  fullName: string;
  email: string;
  startedAtMillis: number;
  elapsedSeconds: number;
  timeoutSeconds: number;
}

export default function AdminDashboard() {
  const { username, logout } = useAdminAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");

  // Người đang đo trên cân + nút hủy lượt đo
  const [current, setCurrent] = useState<CurrentMeasuring | null>(null);
  const [currentFetchedAt, setCurrentFetchedAt] = useState(0);
  const [nowMs, setNowMs] = useState(Date.now());
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const fetchStats = async () => {
    try {
      const res = await axiosClient.get("/api/workshop/admin/dashboard");
      setStats(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Không thể tải số liệu");
    }
  };

  const fetchCurrent = async () => {
    try {
      const res = await axiosClient.get("/api/workshop/admin/current-measuring");
      // 204 No Content (trạm cân trống) -> res.data là chuỗi rỗng
      setCurrent(res.data ? res.data : null);
      setCurrentFetchedAt(Date.now());
    } catch {
      // Lỗi mạng thoáng qua: giữ nguyên trạng thái đang hiển thị, lần sau thử lại
    }
  };

  useEffect(() => {
    fetchStats();
    // Tự làm mới mỗi 5 giây - phù hợp xem trực tiếp trong lúc sự kiện đang diễn ra
    const intervalId = setInterval(fetchStats, 5000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    fetchCurrent();
    // Người đang đo cần cập nhật nhanh hơn để admin kịp hủy
    const intervalId = setInterval(fetchCurrent, 3000);
    return () => clearInterval(intervalId);
  }, []);

  // Đồng hồ nội bộ 1 giây/lần để đếm thời gian đã chờ khi có người đang đo
  useEffect(() => {
    if (!current) return;
    const tickId = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(tickId);
  }, [current]);

  const handleCancel = async () => {
    if (!current) return;
    const ok = window.confirm(
      `Hủy lượt đo của ${current.fullName}?\nNgười này sẽ phải bấm "Sẵn sàng" lại.`,
    );
    if (!ok) return;

    setCancelling(true);
    setCancelError("");
    try {
      await axiosClient.post(
        `/api/workshop/admin/sessions/${current.sessionId}/cancel`,
      );
    } catch (err: any) {
      setCancelError(err.response?.data?.message || "Không thể hủy lượt đo");
    } finally {
      setCancelling(false);
      fetchCurrent();
      fetchStats();
    }
  };

  // Server tính sẵn elapsed lúc trả dữ liệu; cộng thêm thời gian trôi trên máy admin
  const elapsedSeconds = current
    ? current.elapsedSeconds +
      Math.max(0, Math.floor((nowMs - currentFetchedAt) / 1000))
    : 0;
  const remainingSeconds = current
    ? Math.max(0, current.timeoutSeconds - elapsedSeconds)
    : 0;

  return (
    <main className="min-h-dvh bg-paper px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[700px] lg:max-w-4xl">
        <div className="mb-5">
          <Logo />
        </div>

        <header className="mb-7 flex flex-col gap-4 border-b border-hairline pb-[18px] sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-1.5 text-xs font-bold uppercase tracking-[0.08em] text-muted">
              Xin chào, {username}
            </div>
            <h1 className="break-words text-2xl font-bold text-ink">
              Tổng quan Workshop
            </h1>
          </div>

          <button
            type="button"
            onClick={logout}
            className="min-h-11 w-full rounded-lg border border-risk bg-transparent px-4 py-2.5 text-[13px] font-semibold text-risk transition hover:bg-risk hover:text-white focus:outline-none focus:ring-2 focus:ring-risk/20 sm:w-auto"
          >
            Đăng xuất
          </button>
        </header>

        {error && (
          <p
            className="mb-5 rounded-lg border border-hairline bg-paper-raised px-3 py-3 text-sm leading-5 text-risk"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Trạm cân: ai đang đo + nút hủy lượt đo */}
        <section
          aria-label="Trạm cân"
          className={`mb-5 rounded-lg border bg-paper-raised p-4 sm:p-[18px] ${
            current ? "border-safe" : "border-hairline"
          }`}
        >
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-muted">
            <span
              aria-hidden="true"
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                current ? "animate-pulse bg-safe" : "bg-hairline"
              }`}
            />
            Trạm cân
          </div>

          {current ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="break-words text-lg font-bold text-ink">
                  {current.fullName}
                </div>
                <div className="break-all text-[13px] text-muted">
                  {current.email}
                </div>
                <div className="mt-2 text-sm text-ink">
                  Bấm &quot;Sẵn sàng&quot; lúc{" "}
                  <span className="font-number font-semibold">
                    {new Date(current.startedAtMillis).toLocaleTimeString(
                      "vi-VN",
                      { hour: "2-digit", minute: "2-digit", second: "2-digit" },
                    )}
                  </span>
                  {" · "}đã chờ{" "}
                  <span className="font-number font-semibold">
                    {elapsedSeconds}
                  </span>
                  {" giây"}
                </div>
                <div
                  className={`text-[13px] ${
                    remainingSeconds <= 10 ? "text-risk" : "text-muted"
                  }`}
                >
                  {remainingSeconds > 0
                    ? `Tự hết hạn sau ${remainingSeconds} giây`
                    : "Sắp hết hạn..."}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="min-h-11 w-full shrink-0 rounded-lg border border-risk bg-transparent px-4 py-2.5 text-sm font-semibold text-risk transition hover:bg-risk hover:text-white focus:outline-none focus:ring-2 focus:ring-risk/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {cancelling ? "Đang hủy…" : "Hủy lượt đo"}
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted">
              Trạm cân đang trống — chưa có ai bấm &quot;Sẵn sàng&quot;.
            </p>
          )}

          {cancelError && (
            <p className="mt-3 text-[13px] leading-5 text-risk" role="alert">
              {cancelError}
            </p>
          )}
        </section>

        {stats && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="col-span-2 rounded-lg border border-hairline bg-paper-raised p-4 sm:p-[18px] md:col-span-1">
                <div className="mb-2 text-xs font-semibold leading-5 text-muted">
                  Tổng số người tham gia
                </div>
                <div className="font-number text-2xl font-bold text-ink">
                  {stats.totalParticipants}
                </div>
              </div>

              <div className="rounded-lg border border-hairline bg-paper-raised p-4 sm:p-[18px]">
                <div className="mb-2 text-xs font-semibold leading-5 text-muted">
                  Đã đo xong
                </div>
                <div className="font-number text-2xl font-bold text-ink">
                  {stats.completedCount}
                </div>
              </div>

              <div className="rounded-lg border border-hairline bg-paper-raised p-4 sm:p-[18px]">
                <div className="mb-2 text-xs font-semibold leading-5 text-muted">
                  Đang chờ / đang đo
                </div>
                <div className="font-number text-2xl font-bold text-ink">
                  {stats.pendingCount}
                </div>
              </div>
            </div>

            <div className="mt-7 flex sm:justify-end">
              <Link
                to="/admin/dashboard/details"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-safe px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-safe/25 sm:w-auto"
              >
                Xem chi tiết người tham gia
              </Link>
            </div>

            <h2 className="mb-3 mt-7 text-[15px] font-bold text-ink">
              Trung bình (những người đã đo)
            </h2>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="col-span-2 rounded-lg border border-hairline bg-paper-raised p-4 sm:p-[18px] md:col-span-1">
                <div className="mb-2 text-xs font-semibold leading-5 text-muted">
                  Cân nặng TB
                </div>
                <div className="font-number text-2xl font-bold text-ink">
                  {stats.avgWeightKg != null
                    ? `${stats.avgWeightKg.toFixed(1)} kg`
                    : "—"}
                </div>
              </div>

              <div className="rounded-lg border border-hairline bg-paper-raised p-4 sm:p-[18px]">
                <div className="mb-2 text-xs font-semibold leading-5 text-muted">
                  Chiều cao TB
                </div>
                <div className="font-number text-2xl font-bold text-ink">
                  {stats.avgHeightCm != null
                    ? `${stats.avgHeightCm.toFixed(1)} cm`
                    : "—"}
                </div>
              </div>

              <div className="rounded-lg border border-hairline bg-paper-raised p-4 sm:p-[18px]">
                <div className="mb-2 text-xs font-semibold leading-5 text-muted">
                  BMI TB
                </div>
                <div className="font-number text-2xl font-bold text-ink">
                  {stats.avgBmi != null ? stats.avgBmi.toFixed(1) : "—"}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}