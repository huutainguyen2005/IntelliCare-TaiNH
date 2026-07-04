import React from "react";

interface ModalProps {
  isOpen: boolean;
  message: string;
  type: "success" | "error" | "warning";
  onClose: () => void;
}

export default function Modal({ isOpen, message, type, onClose }: ModalProps) {
  if (!isOpen) return null;

  const getHeaderStyle = () => {
    switch (type) {
      case "success":
        return { backgroundColor: "#4CAF50", title: "Thành công" };
      case "error":
        return { backgroundColor: "#f44336", title: "Lỗi" };
      case "warning":
        return { backgroundColor: "#ff9800", title: "Cảnh báo" };
      default:
        return { backgroundColor: "#2196F3", title: "Thông báo" };
    }
  };

  const headerConfig = getHeaderStyle();

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div
          style={{
            ...headerStyle,
            backgroundColor: headerConfig.backgroundColor,
          }}
        >
          {headerConfig.title}
        </div>
        <div style={contentStyle}>{message}</div>
        <div style={footerStyle}>
          <button onClick={onClose} style={buttonStyle}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

// CSS thuần bằng style object để bạn không cần tạo thêm file CSS
const overlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  borderRadius: "8px",
  width: "350px",
  maxWidth: "90%",
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const headerStyle: React.CSSProperties = {
  padding: "12px 16px",
  color: "#fff",
  fontWeight: "bold",
  fontSize: "16px",
};

const contentStyle: React.CSSProperties = {
  padding: "20px 16px",
  fontSize: "15px",
  color: "#333",
  lineHeight: "1.5",
};

const footerStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderTop: "1px solid #eee",
  display: "flex",
  justifyContent: "flex-end",
  backgroundColor: "#f9f9f9",
};

const buttonStyle: React.CSSProperties = {
  padding: "8px 16px",
  backgroundColor: "#555",
  color: "#fff",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
};
