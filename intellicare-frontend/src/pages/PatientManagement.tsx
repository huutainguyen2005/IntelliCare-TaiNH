import React, { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import Modal from "../components/Modal";

interface WeightLogItem {
  logId: number;
  weightKg: number;
  deviceId: string;
  measuredAt: string;
}

interface PatientItem {
  patientId: number;
  patientCode: string;
  phoneNumber: string;
  email: string | null;
  idCard: string | null;
  address: string | null;
  fullName: string;
  dob: string | null;
  gender: string | null;
  faceImageUrl: string | null;
  accountStatus: "PENDING_PASSWORD" | "ACTIVE";
  isActive: boolean;
  weightLog: WeightLogItem[];
}

interface PatientFormState {
  patientId: number;
  fullName: string;
  gender: string;
  address: string;
  email: string;
  phoneNumber: string;
}

export default function PatientManagement() {
  const [patientList, setPatientList] = useState<PatientItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 5;

  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PENDING_PASSWORD" | "ACTIVE"
  >("ALL");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "LOCKED">(
    "ALL",
  );

  const [editForm, setEditForm] = useState<PatientFormState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [confirmDeletePatient, setConfirmDeletePatient] =
    useState<PatientItem | null>(null);
  const [confirmTogglePatient, setConfirmTogglePatient] =
    useState<PatientItem | null>(null);

  const [detailPatient, setDetailPatient] = useState<PatientItem | null>(null);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "warning";
  }>({ isOpen: false, message: "", type: "warning" });

  const showModal = (
    message: string,
    type: "success" | "error" | "warning",
  ) => {
    setModalConfig({ isOpen: true, message, type });
  };

  // Ghi chú: lấy 1 lần với size lớn rồi lọc/phân trang phía Client, đồng bộ
  // cách làm với StaffManagement.tsx. Nếu số lượng bệnh nhân lên tới hàng
  // chục nghìn, nên đổi sang phân trang thật từ Server (BE đã hỗ trợ sẵn
  // qua ?page=&size=, chỉ cần đổi lại cách gọi ở đây).
  const fetchPatientList = async () => {
    setIsLoading(true);
    try {
      const res = await axiosClient.get("/api/patients", {
        params: { page: 0, size: 1000 },
      });
      const sorted = (res.data.content as PatientItem[]).sort(
        (a, b) => b.patientId - a.patientId,
      );
      setPatientList(sorted);
    } catch (error) {
      console.error("Lỗi khi tải danh sách bệnh nhân:", error);
      showModal(
        "Không thể tải danh sách bệnh nhân. Vui lòng thử lại!",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientList();
  }, []);

  const openEditForm = (p: PatientItem) => {
    setEditForm({
      patientId: p.patientId,
      fullName: p.fullName,
      gender: p.gender || "Nam",
      address: p.address || "",
      email: p.email || "",
      phoneNumber: p.phoneNumber,
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    setIsSubmitting(true);

    try {
      await axiosClient.put(`/api/patients/${editForm.patientId}`, {
        fullName: editForm.fullName.trim(),
        gender: editForm.gender,
        address: editForm.address.trim(),
        email: editForm.email.trim() || null,
        phoneNumber: editForm.phoneNumber.trim(),
      });
      showModal("Cập nhật thành công!", "success");
      setEditForm(null);
      fetchPatientList();
    } catch (error: any) {
      const backendMsg = error.response?.data?.message;
      showModal(backendMsg || "Có lỗi xảy ra, vui lòng thử lại!", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async () => {
    if (!confirmTogglePatient) return;
    try {
      const res = await axiosClient.patch(
        `/api/patients/${confirmTogglePatient.patientId}/toggle-active`,
      );
      showModal(res.data.message, "success");
      setConfirmTogglePatient(null);
      fetchPatientList();
    } catch (error: any) {
      const backendMsg = error.response?.data?.message;
      showModal(backendMsg || "Không thể thay đổi trạng thái hồ sơ!", "error");
      setConfirmTogglePatient(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeletePatient) return;
    try {
      await axiosClient.delete(
        `/api/patients/${confirmDeletePatient.patientId}`,
      );
      showModal("Đã xóa hồ sơ bệnh nhân thành công!", "success");
      setConfirmDeletePatient(null);
      fetchPatientList();
    } catch (error: any) {
      const backendMsg = error.response?.data?.message;
      showModal(backendMsg || "Không thể xóa hồ sơ này!", "error");
      setConfirmDeletePatient(null);
    }
  };

  const filteredList = patientList.filter((p) => {
    const kw = search.toLowerCase();
    const matchSearch =
      p.fullName.toLowerCase().includes(kw) ||
      p.patientCode.toLowerCase().includes(kw) ||
      p.phoneNumber.includes(search) ||
      (p.idCard || "").includes(search);
    const matchStatus =
      statusFilter === "ALL" || p.accountStatus === statusFilter;
    const matchActive =
      activeFilter === "ALL" ||
      (activeFilter === "ACTIVE" ? p.isActive : !p.isActive);
    return matchSearch && matchStatus && matchActive;
  });

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PER_PAGE));
  const pagedList = filteredList.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const statusLabel = (status: string) =>
    status === "ACTIVE" ? "Đã kích hoạt" : "Chưa kích hoạt";

  return (
    <div style={styles.pageBackground}>
      <div style={styles.container}>
        <h2 style={styles.title}>QUẢN LÝ BỆNH NHÂN</h2>

        <input
          style={styles.searchInput}
          placeholder="🔍 Tìm theo tên, mã BN, SĐT hoặc CCCD..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <div style={styles.filterRow}>
          <select
            style={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter);
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả trạng thái kích hoạt</option>
            <option value="ACTIVE">Đã kích hoạt</option>
            <option value="PENDING_PASSWORD">Chưa kích hoạt</option>
          </select>

          <select
            style={styles.filterSelect}
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value as typeof activeFilter);
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả hồ sơ</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="LOCKED">Đã khóa</option>
          </select>
        </div>

        {isLoading ? (
          <p style={styles.loadingText}>Đang tải danh sách...</p>
        ) : filteredList.length === 0 ? (
          <p style={styles.emptyText}>Không tìm thấy bệnh nhân nào.</p>
        ) : (
          <div style={{ marginTop: "20px" }}>
            {pagedList.map((p) => (
              <div key={p.patientId} style={styles.patientCard}>
                <div
                  style={{ cursor: "pointer" }}
                  onClick={() => setDetailPatient(p)}
                >
                  <div style={styles.patientName}>
                    {p.fullName}
                    {!p.isActive && (
                      <span style={styles.lockedTag}>ĐÃ KHÓA</span>
                    )}
                  </div>
                  <div style={styles.patientMeta}>
                    {p.patientCode} · {p.phoneNumber} ·{" "}
                    {statusLabel(p.accountStatus)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    style={p.isActive ? styles.btnLock : styles.btnUnlock}
                    onClick={() => setConfirmTogglePatient(p)}
                  >
                    {p.isActive ? "Khóa" : "Mở khóa"}
                  </button>
                  <button
                    style={styles.btnEdit}
                    onClick={() => openEditForm(p)}
                  >
                    Sửa
                  </button>
                  <button
                    style={styles.btnDelete}
                    onClick={() => setConfirmDeletePatient(p)}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && filteredList.length > PER_PAGE && (
          <div style={styles.paginationRow}>
            <button
              style={{
                ...styles.pageBtn,
                ...(page === 1 ? styles.pageBtnDisabled : {}),
              }}
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Trước
            </button>
            <span style={styles.pageIndicator}>
              Trang {page}/{totalPages}
            </span>
            <button
              style={{
                ...styles.pageBtn,
                ...(page >= totalPages ? styles.pageBtnDisabled : {}),
              }}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau →
            </button>
          </div>
        )}
      </div>

      {/* MODAL SỬA THÔNG TIN */}
      {editForm && (
        <div style={styles.overlay} onClick={() => setEditForm(null)}>
          <div style={styles.formCard} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.formTitle}>Chỉnh sửa thông tin bệnh nhân</h3>

            <form onSubmit={handleUpdate}>
              <label style={styles.label}>Họ và tên</label>
              <input
                style={styles.input}
                value={editForm.fullName}
                onChange={(e) =>
                  setEditForm({ ...editForm, fullName: e.target.value })
                }
                required
              />

              <label style={styles.label}>Giới tính</label>
              <select
                style={styles.input}
                value={editForm.gender}
                onChange={(e) =>
                  setEditForm({ ...editForm, gender: e.target.value })
                }
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>

              <label style={styles.label}>Số điện thoại</label>
              <input
                style={styles.input}
                value={editForm.phoneNumber}
                onChange={(e) =>
                  setEditForm({ ...editForm, phoneNumber: e.target.value })
                }
                required
              />

              <label style={styles.label}>Email</label>
              <input
                type="email"
                style={styles.input}
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
              />

              <label style={styles.label}>Địa chỉ</label>
              <input
                style={styles.input}
                value={editForm.address}
                onChange={(e) =>
                  setEditForm({ ...editForm, address: e.target.value })
                }
              />

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button
                  type="button"
                  style={styles.btnCancel}
                  onClick={() => setEditForm(null)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={styles.btnSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang xử lý..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT (xem lịch sử đo nhanh) */}
      {detailPatient && (
        <div style={styles.overlay} onClick={() => setDetailPatient(null)}>
          <div style={styles.formCard} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.formTitle}>{detailPatient.fullName}</h3>
            <p style={styles.detailRow}>
              <b>Mã BN:</b> {detailPatient.patientCode}
            </p>
            <p style={styles.detailRow}>
              <b>SĐT:</b> {detailPatient.phoneNumber}
            </p>
            <p style={styles.detailRow}>
              <b>Email:</b> {detailPatient.email || "Chưa cập nhật"}
            </p>
            <p style={styles.detailRow}>
              <b>CCCD:</b> {detailPatient.idCard || "Chưa cập nhật"}
            </p>
            <p style={styles.detailRow}>
              <b>Địa chỉ:</b> {detailPatient.address || "Chưa cập nhật"}
            </p>
            <p style={styles.detailRow}>
              <b>Trạng thái:</b> {statusLabel(detailPatient.accountStatus)}
            </p>

            <h4 style={{ marginTop: "16px", marginBottom: "8px" }}>
              Lịch sử đo gần đây
            </h4>
            {detailPatient.weightLog.length === 0 ? (
              <p style={styles.detailRow}>Chưa có dữ liệu đo.</p>
            ) : (
              detailPatient.weightLog
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.measuredAt).getTime() -
                    new Date(a.measuredAt).getTime(),
                )
                .slice(0, 5)
                .map((log) => (
                  <p key={log.logId} style={styles.detailRow}>
                    {new Date(log.measuredAt).toLocaleDateString("vi-VN")} —{" "}
                    <b>{log.weightKg} kg</b>
                  </p>
                ))
            )}

            <button
              style={{ ...styles.btnCancel, marginTop: "16px" }}
              onClick={() => setDetailPatient(null)}
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN KHÓA/MỞ KHÓA */}
      {confirmTogglePatient && (
        <div
          style={styles.overlay}
          onClick={() => setConfirmTogglePatient(null)}
        >
          <div style={styles.confirmCard} onClick={(e) => e.stopPropagation()}>
            <p style={styles.confirmText}>
              Bạn có chắc muốn{" "}
              {confirmTogglePatient.isActive ? "khóa" : "mở khóa"} hồ sơ{" "}
              <strong>{confirmTogglePatient.fullName}</strong>?
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                style={styles.btnCancel}
                onClick={() => setConfirmTogglePatient(null)}
              >
                Hủy
              </button>
              <button
                style={
                  confirmTogglePatient.isActive
                    ? styles.btnLockConfirm
                    : styles.btnUnlock
                }
                onClick={handleToggleActive}
              >
                {confirmTogglePatient.isActive
                  ? "Xác nhận khóa"
                  : "Xác nhận mở khóa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA */}
      {confirmDeletePatient && (
        <div
          style={styles.overlay}
          onClick={() => setConfirmDeletePatient(null)}
        >
          <div style={styles.confirmCard} onClick={(e) => e.stopPropagation()}>
            <p style={styles.confirmText}>
              Bạn có chắc muốn xóa hồ sơ{" "}
              <strong>{confirmDeletePatient.fullName}</strong>? Hành động này
              không thể hoàn tác.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                style={styles.btnCancel}
                onClick={() => setConfirmDeletePatient(null)}
              >
                Hủy
              </button>
              <button style={styles.btnDelete} onClick={handleDelete}>
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={modalConfig.isOpen}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageBackground: {
    minHeight: "calc(100vh - 80px)",
    background: "var(--bg)",
    padding: "30px 20px",
    fontFamily: "'Segoe UI', Roboto, sans-serif",
  },
  container: {
    maxWidth: "800px",
    margin: "0 auto",
  },
  title: {
    fontSize: "22px",
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: "20px",
  },
  searchInput: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
    backgroundColor: "#ffffff",
  },
  filterRow: {
    display: "flex",
    gap: "10px",
    marginTop: "12px",
    flexWrap: "wrap",
  },
  filterSelect: {
    flex: "1 1 180px",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    fontSize: "13px",
    fontWeight: 600,
    color: "#334155",
    backgroundColor: "#ffffff",
    outline: "none",
    cursor: "pointer",
  },
  loadingText: {
    textAlign: "center",
    color: "#64748b",
    marginTop: "30px",
  },
  emptyText: {
    textAlign: "center",
    color: "#64748b",
    marginTop: "30px",
    fontStyle: "italic",
  },
  paginationRow: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "16px",
    marginTop: "20px",
    paddingTop: "20px",
    borderTop: "1px solid #e2e8f0",
  },
  pageBtn: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "1px solid #0d9488",
    background: "#ffffff",
    color: "#0d9488",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  pageBtnDisabled: {
    borderColor: "#e2e8f0",
    color: "#cbd5e1",
    cursor: "not-allowed",
  },
  pageIndicator: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#475569",
  },
  patientCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#ffffff",
    padding: "18px 20px",
    borderRadius: "16px",
    marginBottom: "12px",
    border: "1px solid #e2e8f0",
  },
  patientName: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#0f172a",
  },
  patientMeta: {
    fontSize: "13px",
    color: "#64748b",
    marginTop: "4px",
  },
  btnEdit: {
    background: "#eff6ff",
    color: "#2563eb",
    border: "1px solid #bfdbfe",
    borderRadius: "8px",
    padding: "8px 14px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  btnDelete: {
    background: "#fef2f2",
    color: "#ef4444",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "8px 14px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  btnLock: {
    background: "#f1f5f9",
    color: "#475569",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    padding: "8px 14px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  btnUnlock: {
    background: "#f0fdf4",
    color: "#16a34a",
    border: "1px solid #bbf7d0",
    borderRadius: "8px",
    padding: "8px 14px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  btnLockConfirm: {
    flex: 1,
    padding: "12px",
    background: "#ef4444",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontWeight: 700,
    cursor: "pointer",
  },
  lockedTag: {
    marginLeft: "8px",
    fontSize: "10px",
    padding: "2px 8px",
    background: "#fef2f2",
    color: "#ef4444",
    borderRadius: "6px",
    fontWeight: 800,
    letterSpacing: "0.5px",
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(15, 23, 42, 0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    padding: "20px",
    boxSizing: "border-box",
  },
  formCard: {
    background: "#ffffff",
    width: "100%",
    maxWidth: "420px",
    borderRadius: "20px",
    padding: "30px",
    boxSizing: "border-box",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  formTitle: {
    fontSize: "18px",
    fontWeight: 800,
    color: "#0f172a",
    marginTop: 0,
    marginBottom: "20px",
  },
  detailRow: {
    fontSize: "14px",
    color: "#334155",
    margin: "6px 0",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 700,
    color: "#475569",
    marginTop: "12px",
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none",
  },
  btnCancel: {
    flex: 1,
    padding: "12px",
    background: "#f1f5f9",
    color: "#475569",
    border: "none",
    borderRadius: "10px",
    fontWeight: 700,
    cursor: "pointer",
  },
  btnSubmit: {
    flex: 1,
    padding: "12px",
    background: "#0d9488",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontWeight: 700,
    cursor: "pointer",
  },
  confirmCard: {
    background: "#ffffff",
    width: "100%",
    maxWidth: "360px",
    borderRadius: "20px",
    padding: "26px",
    boxSizing: "border-box",
    textAlign: "center",
  },
  confirmText: {
    fontSize: "14px",
    color: "#334155",
    marginBottom: "20px",
    lineHeight: 1.5,
  },
};
