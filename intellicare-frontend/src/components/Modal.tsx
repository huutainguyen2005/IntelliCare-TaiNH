import React from "react";

interface ModalProps {
  isOpen: boolean;
  message: string;
  type: "success" | "error" | "warning";
  onClose: () => void;
}

const COLORS = {
  ink: "#12211A",
  paper: "#F5F6F3",
  paperRaised: "#FFFFFF",
  safe: "#0B6E4F",
  risk: "#9A3324",
  warning: "#92620A",
  muted: "#6B7268",
  hairline: "#D8DAD3",
};

const FONT_SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export default function Modal({ isOpen, message, type, onClose }: ModalProps) {
  if (!isOpen) return null;

  const config = {
    success: { color: COLORS.safe, title: "Thành công", icon: "✓" },
    error: { color: COLORS.risk, title: "Có lỗi xảy ra", icon: "✕" },
    warning: { color: COLORS.warning, title: "Cần lưu ý", icon: "!" },
  }[type];

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            ...iconCircleStyle,
            borderColor: config.color,
            color: config.color,
          }}
        >
          {config.icon}
        </div>
        <h3 style={{ ...titleStyle, color: config.color }}>{config.title}</h3>
        <p style={contentStyle}>{message}</p>
        <button
          onClick={onClose}
          style={{ ...buttonStyle, background: config.color }}
        >
          Đóng
        </button>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(18, 33, 26, 0.45)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 100000, // Luôn nổi trên mọi overlay khác trong app (form modal, dropdown...)
  padding: "20px",
  boxSizing: "border-box",
};

const modalStyle: React.CSSProperties = {
  backgroundColor: COLORS.paperRaised,
  border: `1px solid ${COLORS.hairline}`,
  borderRadius: "12px",
  width: "360px",
  maxWidth: "100%",
  padding: "28px",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  fontFamily: FONT_SANS,
};

const iconCircleStyle: React.CSSProperties = {
  width: "44px",
  height: "44px",
  borderRadius: "50%",
  border: "2px solid",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "20px",
  fontWeight: 700,
  marginBottom: "14px",
  flexShrink: 0,
};

const titleStyle: React.CSSProperties = {
  fontSize: "17px",
  fontWeight: 700,
  margin: "0 0 8px 0",
};

const contentStyle: React.CSSProperties = {
  fontSize: "14px",
  color: COLORS.ink,
  lineHeight: "1.55",
  margin: "0 0 22px 0",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 28px",
  color: "#ffffff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 600,
  fontFamily: FONT_SANS,
};
