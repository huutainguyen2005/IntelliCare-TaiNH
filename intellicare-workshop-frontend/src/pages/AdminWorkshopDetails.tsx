import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";

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
            const res = await axiosClient.get("/api/workshop/admin/dashboard/details");
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
            setError(err.response?.data?.message || "Không thể tải dữ liệu chi tiết.");
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
            `${p.fullName} ${p.email}`.toLowerCase().includes(keyword)
        );
    }, [participants, search]);

    const totalPages = Math.max(1, Math.ceil(filteredParticipants.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * PAGE_SIZE;
    const visibleRows = filteredParticipants.slice(startIndex, startIndex + PAGE_SIZE);

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
        <main className="min-h-screen bg-[#f5f6f3] px-4 py-6 text-[#12211a]">
            <div className="mx-auto max-w-7xl">
                <header className="mb-6 rounded-2xl border border-[#d8dad3] bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6b7268]">
                                Workshop
                            </p>
                            <h1 className="mt-1 text-2xl font-bold">Chi tiết người tham gia</h1>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate("/admin/dashboard")}
                            className="inline-flex items-center justify-center rounded-xl border border-[#d8dad3] bg-white px-4 py-2.5 text-sm font-semibold text-[#12211a] transition hover:bg-[#f5f6f3]"
                        >
                            Quay lại Dashboard
                        </button>
                    </div>
                </header>

                <section className="mb-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-[#d8dad3] bg-white p-4 shadow-sm">
                        <div className="text-xs font-semibold uppercase text-[#6b7268]">Tổng</div>
                        <div className="mt-2 text-3xl font-bold">{summary.total}</div>
                    </div>

                    <div className="rounded-2xl border border-[#d8dad3] bg-white p-4 shadow-sm">
                        <div className="text-xs font-semibold uppercase text-[#6b7268]">Hoàn thành</div>
                        <div className="mt-2 text-3xl font-bold text-[#0b6e4f]">{summary.completed}</div>
                    </div>

                    <div className="rounded-2xl border border-[#d8dad3] bg-white p-4 shadow-sm">
                        <div className="text-xs font-semibold uppercase text-[#6b7268]">BMI trung bình</div>
                        <div className="mt-2 text-3xl font-bold">
                            {summary.avgBmi > 0 ? summary.avgBmi.toFixed(1) : "—"}
                        </div>
                    </div>
                </section>

                {error && (
                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="overflow-hidden rounded-2xl border border-[#d8dad3] bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-[#d8dad3] p-4 md:flex-row md:items-center md:justify-between">
                        <div className="text-sm font-semibold text-[#6b7268]">
                            Danh sách người tham gia
                        </div>

                        <div className="w-full max-w-sm">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Tìm theo tên hoặc email..."
                                className="w-full rounded-xl border border-[#d8dad3] bg-[#f5f6f3] px-3 py-2 text-sm outline-none ring-0 placeholder:text-[#6b7268] focus:border-[#0b6e4f]"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse text-left">
                            <thead className="bg-[#f5f6f3] text-sm">
                            <tr className="border-b border-[#d8dad3]">
                                <th className="px-4 py-3 font-semibold">STT</th>
                                <th className="px-4 py-3 font-semibold">Họ tên</th>
                                <th className="px-4 py-3 font-semibold">Email</th>
                                <th className="px-4 py-3 font-semibold">Thời gian hoàn thành</th>
                                <th className="px-4 py-3 font-semibold text-right">Cân nặng (kg)</th>
                                <th className="px-4 py-3 font-semibold text-right">Chiều cao (cm)</th>
                                <th className="px-4 py-3 font-semibold text-right">BMI</th>
                            </tr>
                            </thead>

                            <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-[#6b7268]">
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : visibleRows.length > 0 ? (
                                visibleRows.map((person, index) => (
                                    <tr
                                        key={`${person.email}-${index}`}
                                        className="border-b border-[#d8dad3] last:border-b-0 hover:bg-[#f5f6f3]"
                                    >
                                        <td className="px-4 py-3 text-[#6b7268]">
                                            {(safePage - 1) * PAGE_SIZE + index + 1}
                                        </td>
                                        <td className="px-4 py-3 font-medium">{person.fullName || "—"}</td>
                                        <td className="px-4 py-3 break-all">{person.email || "—"}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
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
                                    <td colSpan={7} className="px-4 py-10 text-center text-[#6b7268]">
                                        Không tìm thấy dữ liệu phù hợp.
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>

                    {!loading && filteredParticipants.length > 0 && (
                        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#d8dad3] p-4 sm:flex-row">
                            <div className="text-sm text-[#6b7268]">
                                Trang {safePage} / {totalPages}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={safePage === 1}
                                    className="rounded-xl border border-[#d8dad3] bg-white px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Trước
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={safePage === totalPages}
                                    className="rounded-xl border border-[#d8dad3] bg-white px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
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