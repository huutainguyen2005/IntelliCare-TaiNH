import React, { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import Modal from "../components/Modal";

interface StaffItem {
  staffId: number;
  username: string;
  fullName: string;
  role: "ADMIN" | "DOCTOR" | "NURSE";
  managerId: number | null;
  gender: boolean; // true = Nam, false = Nữ (khớp cột bit trong DB)
  email: string | null;
  isActive: boolean;
}

interface StaffFormState {
  staffId: number | null; // null = đang tạo mới, có giá trị = đang sửa
  username: string;
  password: string;
  fullName: string;
  role: "DOCTOR" | "NURSE";
  gender: boolean;
  managerId: string; // giữ dạng string cho input, convert lúc submit
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
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [staffPage, setStaffPage] = useState(1);
  const STAFF_PER_PAGE = 5;

  const [showFormModal, setShowFormModal] = useState(false);
  const [form, setForm] = useState<StaffFormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [confirmDeleteStaff, setConfirmDeleteStaff] =
    useState<StaffItem | null>(null);
  const [confirmToggleStaff, setConfirmToggleStaff] =
    useState<StaffItem | null>(null);

  // Bộ lọc
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
      // Chỉ hiển thị Doctor/Nurse trong bảng quản lý này, ẩn tài khoản Admin đi
      // (không phải để giấu, mà vì trang này không dùng để thao tác lên Admin)
      const filtered = (res.data as StaffItem[])
        .filter((s) => s.role !== "ADMIN")
        // Mới nhất lên đầu (staffId lớn = tạo sau) - để tài khoản vừa tạo
        // luôn hiện ngay ở trang 1, khỏi phải lật trang tìm
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
      password: "", // Để trống = không đổi mật khẩu
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
        // TẠO MỚI
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
        setStaffPage(1); // Về trang 1 để thấy ngay tài khoản vừa tạo
      } else {
        // CẬP NHẬT
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
        <div style={styles.headerRow}>
          <h2 style={styles.title}>QUẢN LÝ BÁC SĨ / Y TÁ</h2>
          <button style={styles.btnCreate} onClick={openCreateForm}>
            + Tạo tài khoản mới
          </button>
        </div>

        <input
          style={styles.searchInput}
          placeholder="🔍 Tìm theo tên hoặc tên đăng nhập..."
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
          <p style={styles.loadingText}>Đang tải danh sách...</p>
        ) : filteredList.length === 0 ? (
          <p style={styles.emptyText}>Chưa có tài khoản Bác sĩ/Y tá nào.</p>
        ) : (
          <div style={{ marginTop: "20px" }}>
            {pagedList.map((s) => (
              <div key={s.staffId} style={styles.staffCard}>
                <div>
                  <div style={styles.staffName}>
                    {s.fullName}
                    {!s.isActive && (
                      <span style={styles.lockedTag}>ĐÃ KHÓA</span>
                    )}
                  </div>
                  <div style={styles.staffMeta}>
                    @{s.username} · {roleLabel(s.role)} ·{" "}
                    {s.gender ? "Nam" : "Nữ"}
                    {s.email ? ` · ${s.email}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
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
                    style={styles.btnDelete}
                    onClick={() => setConfirmDeleteStaff(s)}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PHÂN TRANG - chỉ hiện khi nhiều hơn 1 trang */}
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
                disabled={form.staffId !== null} // Không cho đổi username lúc sửa
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

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
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
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "12px",
  },
  title: {
    fontSize: "22px",
    fontWeight: 800,
    color: "#0f172a",
    margin: 0,
  },
  btnCreate: {
    background: "linear-gradient(135deg, #0d9488 0%, #059669 100%)",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "14px",
    padding: "12px 20px",
    borderRadius: "12px",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(13, 148, 136, 0.2)",
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
    flex: "1 1 150px",
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
  staffCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#ffffff",
    padding: "18px 20px",
    borderRadius: "16px",
    marginBottom: "12px",
    border: "1px solid #e2e8f0",
  },
  staffName: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#0f172a",
  },
  staffMeta: {
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
