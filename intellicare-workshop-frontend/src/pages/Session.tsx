import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { COLORS, FONT_SANS, FONT_NUMBER } from "../theme";

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
      <div style={styles.pageBackground}>
        <p style={{ color: COLORS.risk, fontFamily: FONT_SANS }}>{error}</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={styles.pageBackground}>
        <p style={{ color: COLORS.muted, fontFamily: FONT_SANS }}>
          Đang tải…
        </p>
      </div>
    );
  }

  return (
    <div style={styles.pageBackground}>
      <div style={styles.container}>
        {session.status === "AwaitingStart" && (
          <div style={styles.centerLayout}>
            <p style={styles.eyebrow}>Xin chào</p>
            <h1 style={styles.name}>{session.fullName}</h1>
            <p style={styles.instructionSecondary}>
              Vui lòng di chuyển tới trạm cân. Khi đã đứng lên bàn cân, bấm
              nút bên dưới để bắt đầu đo.
            </p>
            <button
              onClick={handleStartWeighing}
              disabled={isSubmitting}
              style={styles.primaryButton}
            >
              {isSubmitting ? "Đang xử lý…" : "Tôi đã sẵn sàng cân"}
            </button>
            {error && <p style={styles.errorText}>{error}</p>}
          </div>
        )}

        {session.status === "Pending" && (
          <div style={styles.centerLayout}>
            <div style={styles.pulseRing}>
              <div style={styles.pulseDot} />
            </div>
            <h1 style={styles.instruction}>Đang đo…</h1>
            <p style={styles.instructionSecondary}>
              Vui lòng đứng yên trên bàn cân, nhìn thẳng về phía trước.
            </p>
          </div>
        )}

        {session.status === "Completed" && (
          <div style={styles.centerLayout}>
            <p style={styles.eyebrow}>Kết quả của bạn</p>

            <div style={styles.resultGrid}>
              <div style={styles.resultCell}>
                <div style={styles.resultLabel}>Cân nặng</div>
                <div style={styles.resultValue}>
                  {session.weightKg?.toFixed(1)}
                  <span style={styles.resultUnit}>kg</span>
                </div>
              </div>
              <div style={styles.resultCell}>
                <div style={styles.resultLabel}>Chiều cao</div>
                <div style={styles.resultValue}>
                  {session.heightCm?.toFixed(0)}
                  <span style={styles.resultUnit}>cm</span>
                </div>
              </div>
            </div>

            {session.bmi != null && (
              <div style={styles.bmiBox}>
                <div style={styles.resultLabel}>Chỉ số BMI</div>
                <div style={styles.bmiValue}>{session.bmi.toFixed(1)}</div>
                <div style={styles.bmiTag}>{bmiLabel(session.bmi)}</div>
              </div>
            )}

            <p style={styles.emailNote}>
              Kết quả đã được gửi tới <b>{session.email}</b>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  pageBackground: {
    width: "100%",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: COLORS.paper,
    fontFamily: FONT_SANS,
    padding: "20px",
    boxSizing: "border-box",
  },
  container: { width: "100%", maxWidth: "440px" },
  centerLayout: { textAlign: "center" },
  eyebrow: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: COLORS.muted,
    marginBottom: "8px",
  },
  name: {
    fontSize: "clamp(26px, 6vw, 32px)",
    fontWeight: 700,
    color: COLORS.ink,
    margin: "0 0 16px 0",
  },
  instruction: {
    fontSize: "clamp(24px, 5vw, 30px)",
    fontWeight: 700,
    color: COLORS.ink,
    margin: "0 0 10px 0",
  },
  instructionSecondary: {
    fontSize: "15px",
    color: COLORS.muted,
    margin: "0 0 24px 0",
    lineHeight: 1.5,
  },
  primaryButton: {
    width: "100%",
    padding: "16px",
    background: COLORS.safe,
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: FONT_SANS,
  },
  errorText: {
    color: COLORS.risk,
    fontSize: "13px",
    marginTop: "14px",
  },
  pulseRing: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    border: `2px solid ${COLORS.hairline}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 24px",
  },
  pulseDot: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: COLORS.safe,
    animation: "spin 1.4s infinite ease-in-out",
  },
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "12px",
  },
  resultCell: {
    background: COLORS.paperRaised,
    border: `1px solid ${COLORS.hairline}`,
    borderRadius: "10px",
    padding: "18px",
  },
  resultLabel: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: COLORS.muted,
    marginBottom: "6px",
  },
  resultValue: {
    fontFamily: FONT_NUMBER,
    fontSize: "32px",
    fontWeight: 700,
    color: COLORS.ink,
  },
  resultUnit: {
    fontSize: "15px",
    fontWeight: 600,
    color: COLORS.muted,
    marginLeft: "4px",
  },
  bmiBox: {
    background: COLORS.paperRaised,
    border: `1px solid ${COLORS.hairline}`,
    borderTop: `3px solid ${COLORS.safe}`,
    borderRadius: "10px",
    padding: "20px",
    marginBottom: "20px",
  },
  bmiValue: {
    fontFamily: FONT_NUMBER,
    fontSize: "40px",
    fontWeight: 700,
    color: COLORS.ink,
  },
  bmiTag: {
    fontSize: "14px",
    fontWeight: 600,
    color: COLORS.safe,
    marginTop: "4px",
  },
  emailNote: {
    fontSize: "13px",
    color: COLORS.muted,
  },
};
