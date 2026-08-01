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

  const [showFormModal, setShowFormModal] = useState(false);
  const [form, setForm] = useState<StaffFormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Modal "Đặt lại mật khẩu" riêng - dành cho tình huống Nhân viên quên
  // mật khẩu và nhờ Admin cấp lại (nhanh gọn hơn so với mở form Sửa đầy đủ)
  const [resetPwStaff, setResetPwStaff] = useState<StaffItem | null>(null);
  const [resetPwValue, setResetPwValue] = useState("");
  const [isResettingPw, setIsResettingPw] = useState(false);

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
      const filtered = (res.data as StaffItem[]).filter(
        (s) => s.role !== "ADMIN",
      );
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

  const handleDelete = async (id: number) => {
    try {
      await axiosClient.delete(`/api/staff/${id}`);
      showModal("Đã xóa tài khoản thành công!", "success");
      setConfirmDeleteId(null);
      fetchStaffList();
    } catch (error: any) {
      const backendMsg = error.response?.data?.message;
      showModal(backendMsg || "Không thể xóa tài khoản này!", "error");
      setConfirmDeleteId(null);
    }
  };

  const handleToggleActive = async (staff: StaffItem) => {
    try {
      const res = await axiosClient.patch(
        `/api/staff/${staff.staffId}/toggle-active`,
      );
      showModal(res.data.message, "success");
      fetchStaffList();
    } catch (error: any) {
      const backendMsg = error.response?.data?.message;
      showModal(
        backendMsg || "Không thể thay đổi trạng thái tài khoản!",
        "error",
      );
    }
  };

  const openResetPassword = (staff: StaffItem) => {
    setResetPwStaff(staff);
    setResetPwValue("");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPwStaff) return;

    if (resetPwValue.trim().length < 6) {
      showModal("Mật khẩu mới phải có ít nhất 6 ký tự!", "warning");
      return;
    }

    setIsResettingPw(true);
    try {
      await axiosClient.put(`/api/staff/${resetPwStaff.staffId}`, {
        password: resetPwValue.trim(),
      });
      showModal(
        `Đã đặt lại mật khẩu cho "${resetPwStaff.fullName}" thành công! Hãy báo mật khẩu mới cho họ.`,
        "success",
      );
      setResetPwStaff(null);
      setResetPwValue("");
    } catch (error: any) {
      const backendMsg = error.response?.data?.message;
      showModal(backendMsg || "Không thể đặt lại mật khẩu!", "error");
    } finally {
      setIsResettingPw(false);
    }
  };

  const filteredList = staffList.filter(
    (s) =>
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.username.toLowerCase().includes(search.toLowerCase()),
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
          onChange={(e) => setSearch(e.target.value)}
        />

        {isLoading ? (
          <p style={styles.loadingText}>Đang tải danh sách...</p>
        ) : filteredList.length === 0 ? (
          <p style={styles.emptyText}>Chưa có tài khoản Bác sĩ/Y tá nào.</p>
        ) : (
          <div style={{ marginTop: "20px" }}>
            {filteredList.map((s) => (
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
                    onClick={() => handleToggleActive(s)}
                  >
                    {s.isActive ? "Khóa" : "Mở khóa"}
                  </button>
                  <button
                    style={styles.btnResetPw}
                    onClick={() => openResetPassword(s)}
                  >
                    Đặt lại mật khẩu
                  </button>
                  <button
                    style={styles.btnEdit}
                    onClick={() => openEditForm(s)}
                  >
                    Sửa
                  </button>
                  <button
                    style={styles.btnDelete}
                    onClick={() => setConfirmDeleteId(s.staffId)}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
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

      {/* MODAL ĐẶT LẠI MẬT KHẨU - dành cho Nhân viên quên mật khẩu */}
      {resetPwStaff && (
        <div style={styles.overlay} onClick={() => setResetPwStaff(null)}>
          <div style={styles.formCard} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.formTitle}>
              Đặt lại mật khẩu cho "{resetPwStaff.fullName}"
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "#64748b",
                marginTop: "-10px",
                marginBottom: "16px",
              }}
            >
              Nhập mật khẩu mới rồi báo trực tiếp cho nhân viên này.
            </p>

            <form onSubmit={handleResetPassword}>
              <label style={styles.label}>Mật khẩu mới</label>
              <input
                type="password"
                style={styles.input}
                value={resetPwValue}
                onChange={(e) => setResetPwValue(e.target.value)}
                placeholder="Ít nhất 6 ký tự"
                autoFocus
                required
              />

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button
                  type="button"
                  style={styles.btnCancel}
                  onClick={() => setResetPwStaff(null)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={styles.btnSubmit}
                  disabled={isResettingPw}
                >
                  {isResettingPw ? "Đang xử lý..." : "Xác nhận"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA */}
      {confirmDeleteId !== null && (
        <div style={styles.overlay} onClick={() => setConfirmDeleteId(null)}>
          <div style={styles.confirmCard} onClick={(e) => e.stopPropagation()}>
            <p style={styles.confirmText}>
              Bạn có chắc muốn xóa tài khoản này? Hành động này không thể hoàn
              tác.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                style={styles.btnCancel}
                onClick={() => setConfirmDeleteId(null)}
              >
                Hủy
              </button>
              <button
                style={styles.btnDelete}
                onClick={() => handleDelete(confirmDeleteId)}
              >
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
  btnResetPw: {
    background: "#fffbeb",
    color: "#b45309",
    border: "1px solid #fde68a",
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
