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
  createdAt: string | null;
  activatedAt: string | null;
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
  const formatDate = (dateInput: string | null): string => {
    if (!dateInput) return "Chưa cập nhật";
    const d = new Date(dateInput);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${d.getFullYear()}`;
  };

  const [patientList, setPatientList] = useState<PatientItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

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
        <header style={styles.header}>
          <div style={styles.eyebrow}>Bệnh nhân</div>
          <h1 style={styles.pageTitle}>Quản lý bệnh nhân</h1>
        </header>

        <input
          style={styles.searchInput}
          placeholder="Tìm theo tên, mã BN, SĐT hoặc CCCD"
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
          <p style={styles.stateText}>Đang tải danh sách…</p>
        ) : filteredList.length === 0 ? (
          <p style={styles.stateText}>Không tìm thấy bệnh nhân nào.</p>
        ) : (
          <div style={styles.table}>
            <div style={styles.tableHeadRow}>
              <span>Bệnh nhân</span>
              <span>Thao tác</span>
            </div>
            {pagedList.map((p) => (
              <div
                key={p.patientId}
                style={styles.tableRow}
                onClick={() => setDetailPatient(p)}
              >
                <div style={styles.rowMainCol}>
                  <span style={styles.rowName}>
                    {p.fullName}
                    {!p.isActive && (
                      <span style={styles.lockedTag}>Đã khóa</span>
                    )}
                  </span>
                  <span style={styles.rowMeta}>
                    {p.patientCode} · {p.phoneNumber} ·{" "}
                    {statusLabel(p.accountStatus)}
                  </span>
                </div>
                <div
                  style={styles.rowActions}
                  onClick={(e) => e.stopPropagation()}
                >
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
                    style={styles.btnDeleteSmall}
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

              <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
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

      {/* MODAL CHI TIẾT */}
      {detailPatient && (
        <div style={styles.overlay} onClick={() => setDetailPatient(null)}>
          <div style={styles.formCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.detailHeader}>
              {detailPatient.faceImageUrl ? (
                <img
                  src={detailPatient.faceImageUrl}
                  alt=""
                  style={styles.avatar}
                />
              ) : (
                <div style={styles.avatarPlaceholder}>
                  {detailPatient.fullName.charAt(0)}
                </div>
              )}
              <div>
                <h3 style={styles.formTitle}>{detailPatient.fullName}</h3>
                <span style={styles.detailSubtitle}>
                  {detailPatient.patientCode}
                </span>
              </div>
            </div>
            <p style={styles.detailRow}>
              <b>Số điện thoại:</b> {detailPatient.phoneNumber}
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
            <p style={styles.detailRow}>
              <b>Ngày tạo hồ sơ:</b> {formatDate(detailPatient.createdAt)}
            </p>
            <p style={styles.detailRow}>
              <b>Ngày kích hoạt:</b> {formatDate(detailPatient.activatedAt)}
            </p>

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

const COLORS = {
  ink: "#12211A",
  paper: "#F5F6F3",
  paperRaised: "#FFFFFF",
  safe: "#0B6E4F",
  risk: "#9A3324",
  muted: "#6B7268",
  hairline: "#D8DAD3",
};

const FONT_SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const FONT_NUMBER =
  "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const styles: Record<string, React.CSSProperties> = {
  pageBackground: {
    minHeight: "calc(100vh - 80px)",
    background: COLORS.paper,
    display: "flex",
    justifyContent: "center",
    padding: "48px 20px",
    fontFamily: FONT_SANS,
    boxSizing: "border-box",
  },
  container: {
    width: "100%",
    maxWidth: "800px",
  },
  header: {
    borderBottom: `1px solid ${COLORS.hairline}`,
    paddingBottom: "18px",
    marginBottom: "24px",
  },
  eyebrow: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: COLORS.muted,
    marginBottom: "6px",
  },
  pageTitle: {
    fontSize: "26px",
    fontWeight: 700,
    color: COLORS.ink,
    margin: 0,
  },
  searchInput: {
    width: "100%",
    padding: "12px 16px",
    fontSize: "15px",
    borderRadius: "8px",
    border: `1px solid ${COLORS.hairline}`,
    background: COLORS.paperRaised,
    color: COLORS.ink,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: FONT_SANS,
  },
  filterRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "12px",
    marginBottom: "28px",
  },
  filterSelect: {
    flex: "1 1 200px",
    padding: "9px 10px",
    borderRadius: "6px",
    border: `1px solid ${COLORS.hairline}`,
    fontSize: "13px",
    color: COLORS.ink,
    background: COLORS.paperRaised,
    outline: "none",
    fontFamily: FONT_SANS,
  },
  stateText: {
    textAlign: "center",
    color: COLORS.muted,
    fontSize: "15px",
    padding: "32px 0",
  },
  table: {
    borderTop: `1px solid ${COLORS.hairline}`,
  },
  tableHeadRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: COLORS.muted,
    padding: "10px 0",
  },
  tableRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 0",
    borderBottom: `1px solid ${COLORS.hairline}`,
    cursor: "pointer",
    gap: "16px",
    flexWrap: "wrap",
  },
  rowMainCol: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    minWidth: 0,
  },
  rowName: {
    fontSize: "16px",
    fontWeight: 600,
    color: COLORS.ink,
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  rowMeta: {
    fontSize: "13px",
    color: COLORS.muted,
  },
  rowActions: {
    display: "flex",
    gap: "8px",
    flexShrink: 0,
  },
  lockedTag: {
    fontSize: "11px",
    fontWeight: 700,
    color: COLORS.risk,
    border: `1px solid ${COLORS.risk}`,
    borderRadius: "4px",
    padding: "1px 6px",
  },
  btnEdit: {
    padding: "7px 14px",
    borderRadius: "6px",
    border: `1px solid ${COLORS.hairline}`,
    background: COLORS.paperRaised,
    color: COLORS.ink,
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT_SANS,
  },
  btnLock: {
    padding: "7px 14px",
    borderRadius: "6px",
    border: `1px solid ${COLORS.hairline}`,
    background: COLORS.paperRaised,
    color: COLORS.muted,
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT_SANS,
  },
  btnUnlock: {
    padding: "7px 14px",
    borderRadius: "6px",
    border: `1px solid ${COLORS.safe}`,
    background: COLORS.paperRaised,
    color: COLORS.safe,
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT_SANS,
  },
  btnDeleteSmall: {
    padding: "7px 14px",
    borderRadius: "6px",
    border: `1px solid ${COLORS.risk}`,
    background: COLORS.paperRaised,
    color: COLORS.risk,
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT_SANS,
  },
  paginationRow: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "20px",
    marginTop: "24px",
  },
  pageBtn: {
    padding: "6px 14px",
    borderRadius: "6px",
    border: `1px solid ${COLORS.hairline}`,
    background: COLORS.paperRaised,
    color: COLORS.ink,
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT_SANS,
  },
  pageBtnDisabled: {
    color: COLORS.muted,
    cursor: "not-allowed",
    opacity: 0.5,
  },
  pageIndicator: {
    fontFamily: FONT_NUMBER,
    fontSize: "13px",
    color: COLORS.muted,
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(18, 33, 26, 0.45)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    padding: "20px",
    boxSizing: "border-box",
    overflowY: "auto",
  },
  formCard: {
    background: COLORS.paperRaised,
    width: "100%",
    maxWidth: "440px",
    borderRadius: "12px",
    padding: "32px",
    boxSizing: "border-box",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  formTitle: {
    fontSize: "19px",
    fontWeight: 700,
    color: COLORS.ink,
    margin: 0,
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    color: COLORS.muted,
    marginTop: "16px",
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "6px",
    border: `1px solid ${COLORS.hairline}`,
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: FONT_SANS,
    color: COLORS.ink,
    background: COLORS.paperRaised,
  },
  btnCancel: {
    flex: 1,
    padding: "12px",
    background: COLORS.paper,
    color: COLORS.ink,
    border: `1px solid ${COLORS.hairline}`,
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT_SANS,
  },
  btnSubmit: {
    flex: 1,
    padding: "12px",
    background: COLORS.safe,
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT_SANS,
  },
  btnDelete: {
    flex: 1,
    padding: "12px",
    background: COLORS.risk,
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT_SANS,
  },
  btnLockConfirm: {
    flex: 1,
    padding: "12px",
    background: COLORS.risk,
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT_SANS,
  },
  confirmCard: {
    background: COLORS.paperRaised,
    width: "100%",
    maxWidth: "380px",
    borderRadius: "12px",
    padding: "28px",
    boxSizing: "border-box",
    textAlign: "center",
  },
  confirmText: {
    fontSize: "15px",
    color: COLORS.ink,
    marginBottom: "20px",
    lineHeight: 1.5,
  },
  detailHeader: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "20px",
  },
  avatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
  },
  avatarPlaceholder: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    background: COLORS.paper,
    border: `1px solid ${COLORS.hairline}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    fontWeight: 700,
    color: COLORS.muted,
    flexShrink: 0,
  },
  detailSubtitle: {
    fontSize: "13px",
    color: COLORS.muted,
    fontFamily: FONT_NUMBER,
  },
  detailRow: {
    fontSize: "14px",
    color: COLORS.ink,
    margin: "10px 0",
    paddingBottom: "10px",
    borderBottom: `1px solid ${COLORS.hairline}`,
  },
};
