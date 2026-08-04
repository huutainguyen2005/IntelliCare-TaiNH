import React, { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import Modal from "../components/Modal";

interface StaffItem {
  staffId: number;
  username: string;
  fullName: string;
  role: "ADMIN" | "DOCTOR" | "NURSE";
  managerId: number | null;
  gender: boolean;
  email: string | null;
  isActive: boolean;
  createdAt: string | null;
}

interface StaffFormState {
  staffId: number | null;
  username: string;
  password: string;
  fullName: string;
  role: "DOCTOR" | "NURSE";
  gender: boolean;
  managerId: string;
  email: string;
}

const emptyForm: StaffFormState = {
  staffId: null,
  username: "",
  password: "",
  fullName: "",
  role: "NURSE",
  gender: true,
  managerId: "",
  email: "",
};

export default function StaffManagement() {
  const formatDate = (dateInput: string | null): string => {
    if (!dateInput) return "Chưa cập nhật";
    const d = new Date(dateInput);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${d.getFullYear()}`;
  };

  const [detailStaff, setDetailStaff] = useState<StaffItem | null>(null);

  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [staffPage, setStaffPage] = useState(1);
  const STAFF_PER_PAGE = 8;

  const [showFormModal, setShowFormModal] = useState(false);
  const [form, setForm] = useState<StaffFormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [confirmDeleteStaff, setConfirmDeleteStaff] =
    useState<StaffItem | null>(null);
  const [confirmToggleStaff, setConfirmToggleStaff] =
    useState<StaffItem | null>(null);

  const [roleFilter, setRoleFilter] = useState<"ALL" | "DOCTOR" | "NURSE">(
    "ALL",
  );
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "LOCKED">(
    "ALL",
  );
  const [genderFilter, setGenderFilter] = useState<"ALL" | "MALE" | "FEMALE">(
    "ALL",
  );

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

  const fetchStaffList = async () => {
    setIsLoading(true);
    try {
      const res = await axiosClient.get("/api/staff");
      const filtered = (res.data as StaffItem[])
        .filter((s) => s.role !== "ADMIN")
        .sort((a, b) => b.staffId - a.staffId);
      setStaffList(filtered);
    } catch (error) {
      console.error("Lỗi khi tải danh sách nhân viên:", error);
      showModal(
        "Không thể tải danh sách nhân viên. Vui lòng thử lại!",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffList();
  }, []);

  const openCreateForm = () => {
    setForm(emptyForm);
    setShowFormModal(true);
  };

  const openEditForm = (staff: StaffItem) => {
    setForm({
      staffId: staff.staffId,
      username: staff.username,
      password: "",
      fullName: staff.fullName,
      role: staff.role === "ADMIN" ? "NURSE" : staff.role,
      gender: staff.gender,
      managerId: staff.managerId ? String(staff.managerId) : "",
      email: staff.email || "",
    });
    setShowFormModal(true);
  };

  const closeForm = () => {
    setShowFormModal(false);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (form.staffId === null) {
        if (
          !form.username.trim() ||
          !form.password.trim() ||
          !form.fullName.trim()
        ) {
          showModal("Vui lòng điền đầy đủ thông tin bắt buộc!", "warning");
          setIsSubmitting(false);
          return;
        }
        if (form.password.trim().length < 6) {
          showModal("Mật khẩu phải có ít nhất 6 ký tự!", "warning");
          setIsSubmitting(false);
          return;
        }

        await axiosClient.post("/api/staff", {
          username: form.username.trim(),
          password: form.password.trim(),
          fullName: form.fullName.trim(),
          role: form.role,
          gender: form.gender,
          managerId: form.managerId ? Number(form.managerId) : null,
          email: form.email.trim() || null,
        });

        showModal("Tạo tài khoản thành công!", "success");
        setStaffPage(1);
      } else {
        const payload: Record<string, unknown> = {
          fullName: form.fullName.trim(),
          role: form.role,
          gender: form.gender,
          managerId: form.managerId ? Number(form.managerId) : null,
          email: form.email.trim() || null,
        };
        if (form.password.trim()) {
          if (form.password.trim().length < 6) {
            showModal("Mật khẩu mới phải có ít nhất 6 ký tự!", "warning");
            setIsSubmitting(false);
            return;
          }
          payload.password = form.password.trim();
        }

        await axiosClient.put(`/api/staff/${form.staffId}`, payload);
        showModal("Cập nhật thành công!", "success");
      }

      closeForm();
      fetchStaffList();
    } catch (error: any) {
      const backendMsg = error.response?.data?.message;
      showModal(backendMsg || "Có lỗi xảy ra, vui lòng thử lại!", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteStaff) return;
    try {
      await axiosClient.delete(`/api/staff/${confirmDeleteStaff.staffId}`);
      showModal("Đã xóa tài khoản thành công!", "success");
      setConfirmDeleteStaff(null);
      fetchStaffList();
    } catch (error: any) {
      const backendMsg = error.response?.data?.message;
      showModal(backendMsg || "Không thể xóa tài khoản này!", "error");
      setConfirmDeleteStaff(null);
    }
  };

  const handleToggleActive = async () => {
    if (!confirmToggleStaff) return;
    try {
      const res = await axiosClient.patch(
        `/api/staff/${confirmToggleStaff.staffId}/toggle-active`,
      );
      showModal(res.data.message, "success");
      setConfirmToggleStaff(null);
      fetchStaffList();
    } catch (error: any) {
      const backendMsg = error.response?.data?.message;
      showModal(
        backendMsg || "Không thể thay đổi trạng thái tài khoản!",
        "error",
      );
      setConfirmToggleStaff(null);
    }
  };

  const filteredList = staffList.filter((s) => {
    const matchSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.username.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "ALL" || s.role === roleFilter;
    const matchStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" ? s.isActive : !s.isActive);
    const matchGender =
      genderFilter === "ALL" ||
      (genderFilter === "MALE" ? s.gender : !s.gender);
    return matchSearch && matchRole && matchStatus && matchGender;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredList.length / STAFF_PER_PAGE),
  );
  const pagedList = filteredList.slice(
    (staffPage - 1) * STAFF_PER_PAGE,
    staffPage * STAFF_PER_PAGE,
  );

  const roleLabel = (role: string) => {
    if (role === "DOCTOR") return "Bác sĩ";
    if (role === "NURSE") return "Y tá / Điều dưỡng";
    return role;
  };

  return (
    <div style={styles.pageBackground}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerText}>
            <div style={styles.eyebrow}>Nhân sự</div>
            <h1 style={styles.pageTitle}>Quản lý Bác sĩ / Y tá</h1>
          </div>
          <button style={styles.btnCreate} onClick={openCreateForm}>
            + Tạo tài khoản
          </button>
        </header>

        <input
          style={styles.searchInput}
          placeholder="Tìm theo tên hoặc tên đăng nhập"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setStaffPage(1);
          }}
        />

        <div style={styles.filterRow}>
          <select
            style={styles.filterSelect}
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as typeof roleFilter);
              setStaffPage(1);
            }}
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value="DOCTOR">Bác sĩ</option>
            <option value="NURSE">Y tá / Điều dưỡng</option>
          </select>

          <select
            style={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter);
              setStaffPage(1);
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="LOCKED">Đã khóa</option>
          </select>

          <select
            style={styles.filterSelect}
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value as typeof genderFilter);
              setStaffPage(1);
            }}
          >
            <option value="ALL">Tất cả giới tính</option>
            <option value="MALE">Nam</option>
            <option value="FEMALE">Nữ</option>
          </select>
        </div>

        {isLoading ? (
          <p style={styles.stateText}>Đang tải danh sách…</p>
        ) : filteredList.length === 0 ? (
          <p style={styles.stateText}>Chưa có tài khoản Bác sĩ/Y tá nào.</p>
        ) : (
          <div style={styles.table}>
            <div style={styles.tableHeadRow}>
              <span>Nhân viên</span>
              <span>Thao tác</span>
            </div>
            {pagedList.map((s) => (
              <div
                key={s.staffId}
                style={styles.tableRow}
                onClick={() => setDetailStaff(s)}
              >
                <div style={styles.rowMainCol}>
                  <span style={styles.rowName}>
                    {s.fullName}
                    {!s.isActive && (
                      <span style={styles.lockedTag}>Đã khóa</span>
                    )}
                  </span>
                  <span style={styles.rowMeta}>
                    @{s.username} · {roleLabel(s.role)} ·{" "}
                    {s.gender ? "Nam" : "Nữ"}
                  </span>
                </div>
                <div
                  style={styles.rowActions}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    style={s.isActive ? styles.btnLock : styles.btnUnlock}
                    onClick={() => setConfirmToggleStaff(s)}
                  >
                    {s.isActive ? "Khóa" : "Mở khóa"}
                  </button>
                  <button
                    style={styles.btnEdit}
                    onClick={() => openEditForm(s)}
                  >
                    Sửa
                  </button>
                  <button
                    style={styles.btnDeleteSmall}
                    onClick={() => setConfirmDeleteStaff(s)}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && filteredList.length > STAFF_PER_PAGE && (
          <div style={styles.paginationRow}>
            <button
              style={{
                ...styles.pageBtn,
                ...(staffPage === 1 ? styles.pageBtnDisabled : {}),
              }}
              disabled={staffPage === 1}
              onClick={() => setStaffPage((p) => p - 1)}
            >
              ← Trước
            </button>
            <span style={styles.pageIndicator}>
              Trang {staffPage}/{totalPages}
            </span>
            <button
              style={{
                ...styles.pageBtn,
                ...(staffPage >= totalPages ? styles.pageBtnDisabled : {}),
              }}
              disabled={staffPage >= totalPages}
              onClick={() => setStaffPage((p) => p + 1)}
            >
              Sau →
            </button>
          </div>
        )}
      </div>

      {/* MODAL FORM TẠO/SỬA */}
      {showFormModal && (
        <div style={styles.overlay} onClick={closeForm}>
          <div style={styles.formCard} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.formTitle}>
              {form.staffId === null
                ? "Tạo tài khoản mới"
                : "Chỉnh sửa tài khoản"}
            </h3>

            <form onSubmit={handleSubmit}>
              <label style={styles.label}>Tên đăng nhập</label>
              <input
                style={styles.input}
                value={form.username}
                disabled={form.staffId !== null}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required={form.staffId === null}
              />

              <label style={styles.label}>
                {form.staffId === null
                  ? "Mật khẩu"
                  : "Mật khẩu mới (để trống nếu không đổi)"}
              </label>
              <input
                type="password"
                style={styles.input}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={form.staffId === null}
              />

              <label style={styles.label}>Họ và tên</label>
              <input
                style={styles.input}
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
              />

              <label style={styles.label}>
                Email (dùng để nhận OTP khi quên mật khẩu)
              </label>
              <input
                type="email"
                style={styles.input}
                placeholder="VD: nguyenvan@gmail.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />

              <label style={styles.label}>Vai trò</label>
              <select
                style={styles.input}
                value={form.role}
                onChange={(e) =>
                  setForm({
                    ...form,
                    role: e.target.value as "DOCTOR" | "NURSE",
                  })
                }
              >
                <option value="DOCTOR">Bác sĩ</option>
                <option value="NURSE">Y tá / Điều dưỡng</option>
              </select>

              <label style={styles.label}>Giới tính</label>
              <select
                style={styles.input}
                value={form.gender ? "true" : "false"}
                onChange={(e) =>
                  setForm({ ...form, gender: e.target.value === "true" })
                }
              >
                <option value="true">Nam</option>
                <option value="false">Nữ</option>
              </select>

              <label style={styles.label}>
                Mã người quản lý trực tiếp (tùy chọn)
              </label>
              <input
                style={styles.input}
                placeholder="VD: 1 (để trống nếu không có)"
                value={form.managerId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    managerId: e.target.value.replace(/\D/g, ""),
                  })
                }
              />

              <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
                <button
                  type="button"
                  style={styles.btnCancel}
                  onClick={closeForm}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={styles.btnSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Đang xử lý..."
                    : form.staffId === null
                      ? "Tạo tài khoản"
                      : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT */}
      {detailStaff && (
        <div style={styles.overlay} onClick={() => setDetailStaff(null)}>
          <div style={styles.formCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.detailHeader}>
              <div style={styles.avatarPlaceholder}>
                {detailStaff.fullName.charAt(0)}
              </div>
              <div>
                <h3 style={styles.formTitle}>{detailStaff.fullName}</h3>
                <span style={styles.detailSubtitle}>
                  @{detailStaff.username} · {roleLabel(detailStaff.role)}
                </span>
              </div>
            </div>
            <p style={styles.detailRow}>
              <b>Giới tính:</b> {detailStaff.gender ? "Nam" : "Nữ"}
            </p>
            <p style={styles.detailRow}>
              <b>Email:</b> {detailStaff.email || "Chưa cập nhật"}
            </p>
            <p style={styles.detailRow}>
              <b>Mã người quản lý:</b> {detailStaff.managerId ?? "Không có"}
            </p>
            <p style={styles.detailRow}>
              <b>Trạng thái:</b>{" "}
              {detailStaff.isActive ? "Đang hoạt động" : "Đã khóa"}
            </p>
            <p style={styles.detailRow}>
              <b>Ngày tạo tài khoản:</b> {formatDate(detailStaff.createdAt)}
            </p>

            <button
              style={{ ...styles.btnCancel, marginTop: "16px" }}
              onClick={() => setDetailStaff(null)}
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN KHÓA/MỞ KHÓA */}
      {confirmToggleStaff && (
        <div style={styles.overlay} onClick={() => setConfirmToggleStaff(null)}>
          <div style={styles.confirmCard} onClick={(e) => e.stopPropagation()}>
            <p style={styles.confirmText}>
              Bạn có chắc muốn{" "}
              {confirmToggleStaff.isActive ? "khóa" : "mở khóa"} tài khoản{" "}
              <strong>{confirmToggleStaff.fullName}</strong>?
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                style={styles.btnCancel}
                onClick={() => setConfirmToggleStaff(null)}
              >
                Hủy
              </button>
              <button
                style={
                  confirmToggleStaff.isActive
                    ? styles.btnLockConfirm
                    : styles.btnUnlock
                }
                onClick={handleToggleActive}
              >
                {confirmToggleStaff.isActive
                  ? "Xác nhận khóa"
                  : "Xác nhận mở khóa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA */}
      {confirmDeleteStaff && (
        <div style={styles.overlay} onClick={() => setConfirmDeleteStaff(null)}>
          <div style={styles.confirmCard} onClick={(e) => e.stopPropagation()}>
            <p style={styles.confirmText}>
              Bạn có chắc muốn xóa tài khoản{" "}
              <strong>{confirmDeleteStaff.fullName}</strong>? Hành động này
              không thể hoàn tác.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                style={styles.btnCancel}
                onClick={() => setConfirmDeleteStaff(null)}
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

// ============================================================
// TOKENS - dùng chung bảng màu lâm sàng toàn hệ thống
// ============================================================
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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottom: `1px solid ${COLORS.hairline}`,
    paddingBottom: "18px",
    marginBottom: "24px",
    gap: "16px",
    flexWrap: "wrap",
  },
  headerText: {},
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
  btnCreate: {
    padding: "10px 20px",
    background: COLORS.safe,
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT_SANS,
    whiteSpace: "nowrap",
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
    flex: "1 1 150px",
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
  // ===== BẢNG =====
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

  // ===== OVERLAY / FORM MODAL =====
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

  // ===== MODAL CHI TIẾT =====
  detailHeader: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "20px",
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
  },
  detailRow: {
    fontSize: "14px",
    color: COLORS.ink,
    margin: "10px 0",
    paddingBottom: "10px",
    borderBottom: `1px solid ${COLORS.hairline}`,
  },
};
