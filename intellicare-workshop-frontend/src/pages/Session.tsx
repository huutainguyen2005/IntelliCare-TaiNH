import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axiosClient from "../api/axiosClient";

interface SessionData {
  sessionId: number;
  status: "AwaitingStart" | "Pending" | "Completed";
  fullName: string;
  email: string;
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
}

function bmiLabel(bmi: number): string {
  if (bmi < 18.5) return "Thiếu cân";
  if (bmi < 23) return "Bình thường";
  if (bmi < 25) return "Thừa cân";
  return "Béo phì";
}

export default function Session() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<SessionData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchStatus = async () => {
    try {
      const res = await axiosClient.get(`/api/workshop/sessions/${sessionId}`);
      setSession(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Không tìm thấy phiên đo");
    }
  };

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Polling khi đang Pending - chờ ESP32 gửi kết quả lên
  useEffect(() => {
    if (!session || session.status !== "Pending") return;

    const intervalId = setInterval(fetchStatus, 2000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status]);

  const handleStartWeighing = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const res = await axiosClient.post(
        `/api/workshop/sessions/${sessionId}/start-weighing`,
      );
      setSession(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Có lỗi xảy ra!");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error && !session) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-paper px-4 py-6 text-center">
        <p className="text-sm leading-6 text-risk" role="alert">
          {error}
        </p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-paper px-4 py-6 text-center">
        <p className="text-sm text-muted">Đang tải…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-paper px-4 py-6 sm:px-6 sm:py-10">
      <div className="w-full max-w-[440px]">
        {session.status === "AwaitingStart" && (
          <div className="text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted">
              Xin chào
            </p>
            <h1 className="mb-4 break-words text-[clamp(26px,7vw,32px)] font-bold text-ink">
              {session.fullName}
            </h1>
            <p className="mb-6 text-[15px] leading-6 text-muted">
              Vui lòng di chuyển tới trạm cân. Khi đã đứng lên bàn cân, bấm nút
              bên dưới để bắt đầu đo.
            </p>
            <button
              onClick={handleStartWeighing}
              disabled={isSubmitting}
              className="min-h-12 w-full rounded-[10px] bg-safe px-4 py-4 text-base font-bold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-safe/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Đang xử lý…" : "Tôi đã sẵn sàng cân"}
            </button>
            {error && (
              <p className="mt-3 text-[13px] leading-5 text-risk" role="alert">
                {error}
              </p>
            )}
          </div>
        )}

        {session.status === "Pending" && (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-hairline">
              <div className="h-7 w-7 rounded-full bg-safe animate-[spin_1.4s_infinite_ease-in-out]" />
            </div>
            <h1 className="mb-2 text-[clamp(24px,6vw,30px)] font-bold text-ink">
              Đang đo…
            </h1>
            <p className="text-[15px] leading-6 text-muted">
              Vui lòng đứng yên trên bàn cân, nhìn thẳng về phía trước.
            </p>
          </div>
        )}

        {session.status === "Completed" && (
          <div className="text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-muted">
              Kết quả của bạn
            </p>

            <div className="mb-3 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
              <div className="rounded-[10px] border border-hairline bg-paper-raised p-4 sm:p-[18px]">
                <div className="mb-1.5 text-xs font-bold uppercase tracking-[0.04em] text-muted">
                  Cân nặng
                </div>
                <div className="font-number text-[32px] font-bold text-ink leading-tight">
                  {session.weightKg?.toFixed(1)}
                  <span className="ml-1 text-[15px] font-semibold text-muted">
                    kg
                  </span>
                </div>
              </div>

              <div className="rounded-[10px] border border-hairline bg-paper-raised p-4 sm:p-[18px]">
                <div className="mb-1.5 text-xs font-bold uppercase tracking-[0.04em] text-muted">
                  Chiều cao
                </div>
                <div className="font-number text-[32px] font-bold text-ink leading-tight">
                  {session.heightCm?.toFixed(0)}
                  <span className="ml-1 text-[15px] font-semibold text-muted">
                    cm
                  </span>
                </div>
              </div>
            </div>

            {session.bmi != null && (
              <div className="mb-5 rounded-[10px] border border-hairline border-t-[3px] border-t-safe bg-paper-raised p-5">
                <div className="mb-1.5 text-xs font-bold uppercase tracking-[0.04em] text-muted">
                  Chỉ số BMI
                </div>
                <div className="font-number text-[40px] font-bold leading-tight text-ink">
                  {session.bmi.toFixed(1)}
                </div>
                <div className="mt-1 text-sm font-semibold text-safe">
                  {bmiLabel(session.bmi)}
                </div>
              </div>
            )}

            <p className="break-words text-[13px] leading-5 text-muted">
              Kết quả đã được gửi tới{" "}
              <b className="font-semibold text-ink">{session.email}</b>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
