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

export default function AdminDashboard() {
  const { username, logout } = useAdminAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");

  const fetchStats = async () => {
    try {
      const res = await axiosClient.get("/api/workshop/admin/dashboard");
      setStats(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Không thể tải số liệu");
    }
  };

  useEffect(() => {
    fetchStats();
    // Tự làm mới mỗi 5 giây - phù hợp xem trực tiếp trong lúc sự kiện đang diễn ra
    const intervalId = setInterval(fetchStats, 5000);
    return () => clearInterval(intervalId);
  }, []);

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
