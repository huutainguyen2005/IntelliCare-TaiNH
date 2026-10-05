import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import Logo from "../components/Logo";

interface Participant {
  fullName: string;
  email: string;
  completedAt: string | null;
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
}

const PAGE_SIZE = 10;

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatNumber(value: number | null, digits = 1) {
  if (value == null) return "—";
  return value.toFixed(digits);
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function extractParticipants(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  for (const key of ["participants", "details", "data", "items", "results"]) {
    const value = obj[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

export default function AdminWorkshopDetails() {
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axiosClient.get(
        "/api/workshop/admin/dashboard/details",
      );
      const rows = extractParticipants(res.data).map((item: any) => ({
        fullName: item.fullName ?? item.name ?? item.participantName ?? "",
        email: item.email ?? "",
        completedAt: item.completedAt ?? item.completed_at ?? null,
        weightKg: toNumber(item.weightKg ?? item.weight_kg ?? item.weight),
        heightCm: toNumber(item.heightCm ?? item.height_cm ?? item.height),
        bmi: toNumber(item.bmi ?? item.bmiIndex),
      }));
      setParticipants(rows);
      setPage(1);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Không thể tải dữ liệu chi tiết.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredParticipants = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return participants;
    return participants.filter((p) =>
      `${p.fullName} ${p.email}`.toLowerCase().includes(keyword),
    );
  }, [participants, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredParticipants.length / PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const visibleRows = filteredParticipants.slice(
    startIndex,
    startIndex + PAGE_SIZE,
  );

  const summary = useMemo(() => {
    const completed = participants.filter((p) => p.completedAt).length;
    const bmiValues = participants
      .map((p) => p.bmi)
      .filter((v): v is number => v != null);
    const avgBmi =
      bmiValues.length > 0
        ? bmiValues.reduce((sum, x) => sum + x, 0) / bmiValues.length
        : 0;

    return {
      total: participants.length,
      completed,
      avgBmi,
    };
  }, [participants]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <main className="min-h-dvh bg-paper px-4 py-5 text-ink sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-4 sm:mb-5">
          <Logo />
        </div>

        {/* Header */}
        <header className="mb-4 rounded-2xl border border-hairline bg-paper-raised p-4 shadow-sm sm:mb-6 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
                Workshop
              </p>
              <h1 className="mt-1 break-words text-xl font-bold sm:text-2xl">
                Chi tiết người tham gia
              </h1>
            </div>

            <button
              type="button"
              onClick={() => navigate("/admin/dashboard")}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-hairline bg-paper-raised px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-paper focus:outline-none focus:ring-2 focus:ring-safe/25 sm:w-auto"
            >
              Quay lại Dashboard
            </button>
          </div>
        </header>

        {/* Summary - luôn 3 cột, thu nhỏ chữ trên mobile */}
        <section className="mb-4 grid grid-cols-3 gap-2 sm:mb-6 sm:gap-4">
          <div className="rounded-2xl border border-hairline bg-paper-raised p-3 shadow-sm sm:p-4">
            <div className="text-[11px] font-semibold uppercase leading-4 text-muted sm:text-xs">
              Tổng
            </div>
            <div className="mt-1 text-2xl font-bold sm:mt-2 sm:text-3xl">
              {summary.total}
            </div>
          </div>

          <div className="rounded-2xl border border-hairline bg-paper-raised p-3 shadow-sm sm:p-4">
            <div className="text-[11px] font-semibold uppercase leading-4 text-muted sm:text-xs">
              Hoàn thành
            </div>
            <div className="mt-1 text-2xl font-bold text-safe sm:mt-2 sm:text-3xl">
              {summary.completed}
            </div>
          </div>

          <div className="rounded-2xl border border-hairline bg-paper-raised p-3 shadow-sm sm:p-4">
            <div className="text-[11px] font-semibold uppercase leading-4 text-muted sm:text-xs">
              BMI TB
            </div>
            <div className="mt-1 text-2xl font-bold sm:mt-2 sm:text-3xl">
              {summary.avgBmi > 0 ? summary.avgBmi.toFixed(1) : "—"}
            </div>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-risk/30 bg-risk/5 px-4 py-3 text-sm text-risk"
          >
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-hairline bg-paper-raised shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-hairline p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-semibold text-muted">
              Danh sách người tham gia
            </div>

            <div className="w-full sm:max-w-xs lg:max-w-sm">
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm theo tên hoặc email..."
                aria-label="Tìm theo tên hoặc email"
                className="w-full rounded-xl border border-hairline bg-paper px-3.5 py-2.5 text-base outline-none placeholder:text-muted focus:border-safe focus:ring-2 focus:ring-safe/10"
              />
            </div>
          </div>

          {/* Mobile + tablet: dạng thẻ (< lg) */}
          <div className="lg:hidden">
            {loading ? (
              <div className="px-4 py-10 text-center text-sm text-muted">
                Đang tải dữ liệu...
              </div>
            ) : visibleRows.length > 0 ? (
              <ul className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4">
                {visibleRows.map((person, index) => (
                  <li
                    key={`${person.email}-${index}`}
                    className="min-w-0 rounded-xl border border-hairline bg-paper p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-hairline/60 px-1.5 text-xs font-semibold text-muted">
                        {startIndex + index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="break-words font-semibold">
                          {person.fullName || "—"}
                        </div>
                        <div className="break-all text-[13px] text-muted">
                          {person.email || "—"}
                        </div>
                        <div className="mt-1 text-xs text-muted">
                          {formatDate(person.completedAt)}
                        </div>
                      </div>
                    </div>

                    <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-hairline pt-3 text-center">
                      <div>
                        <dt className="text-[11px] font-semibold uppercase text-muted">
                          Cân nặng
                        </dt>
                        <dd className="mt-0.5 font-number text-base font-bold">
                          {formatNumber(person.weightKg)}
                          <span className="ml-0.5 text-xs font-medium text-muted">
                            kg
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase text-muted">
                          Chiều cao
                        </dt>
                        <dd className="mt-0.5 font-number text-base font-bold">
                          {formatNumber(person.heightCm)}
                          <span className="ml-0.5 text-xs font-medium text-muted">
                            cm
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase text-muted">
                          BMI
                        </dt>
                        <dd className="mt-0.5 font-number text-base font-bold">
                          {formatNumber(person.bmi)}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-10 text-center text-sm text-muted">
                Không tìm thấy dữ liệu phù hợp.
              </div>
            )}
          </div>

          {/* Desktop: dạng bảng (>= lg) */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full border-collapse text-left">
              <thead className="bg-paper text-sm">
                <tr className="border-b border-hairline">
                  <th className="px-4 py-3 font-semibold">STT</th>
                  <th className="px-4 py-3 font-semibold">Họ tên</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">
                    Thời gian hoàn thành
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Cân nặng (kg)
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Chiều cao (cm)
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">BMI</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-muted"
                    >
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : visibleRows.length > 0 ? (
                  visibleRows.map((person, index) => (
                    <tr
                      key={`${person.email}-${index}`}
                      className="border-b border-hairline last:border-b-0 hover:bg-paper"
                    >
                      <td className="px-4 py-3 text-muted">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {person.fullName || "—"}
                      </td>
                      <td className="break-all px-4 py-3">
                        {person.email || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {formatDate(person.completedAt)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatNumber(person.weightKg)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatNumber(person.heightCm)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatNumber(person.bmi)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-muted"
                    >
                      Không tìm thấy dữ liệu phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filteredParticipants.length > 0 && (
            <div className="flex flex-col items-stretch gap-3 border-t border-hairline p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-center text-sm text-muted sm:text-left">
                Trang {safePage} / {totalPages}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="min-h-11 flex-1 rounded-xl border border-hairline bg-paper-raised px-4 py-2 text-sm font-medium transition hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                >
                  Trước
                </button>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="min-h-11 flex-1 rounded-xl border border-hairline bg-paper-raised px-4 py-2 text-sm font-medium transition hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
