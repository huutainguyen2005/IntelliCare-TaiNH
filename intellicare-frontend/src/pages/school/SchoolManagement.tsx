import React, { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import Modal from "../../components/Modal";

interface SchoolItem {
  schoolId: number;
  name: string;
  address: string | null;
  isActive: boolean;
}
interface ClassItem {
  classId: number;
  name: string;
  isActive: boolean;
}
interface StudentItem {
  studentId: number;
  classId: number;
  className: string;
  fullName: string;
  dob: string | null;
  gender: string | null;
  indexNumber: number;
  isActive: boolean;
  latestWeightKg: number | null;
}

// Quản lý 3 cấp: Trường -> Lớp -> Học sinh. Admin dùng để thiết lập dữ liệu
// trước khi Giáo viên có thể bắt đầu buổi cân (ClassRollCall.tsx).
export default function SchoolManagement() {
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);

  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolAddress, setNewSchoolAddress] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentGender, setNewStudentGender] = useState("Nam");
  const [newStudentIndex, setNewStudentIndex] = useState("");

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "warning";
  }>({ isOpen: false, message: "", type: "warning" });
  const showModal = (message: string, type: "success" | "error" | "warning") =>
    setModalConfig({ isOpen: true, message, type });

  const fetchSchools = async () => {
    try {
      const res = await axiosClient.get("/api/schools");
      setSchools(res.data);
    } catch (error) {
      console.error("Lỗi tải danh sách trường:", error);
    }
  };

  const fetchClasses = async (schoolId: number) => {
    try {
      const res = await axiosClient.get(`/api/schools/${schoolId}/classes`);
      setClasses(res.data);
    } catch (error) {
      console.error("Lỗi tải danh sách lớp:", error);
    }
  };

  const fetchStudents = async (classId: number) => {
    try {
      const res = await axiosClient.get(
        `/api/schools/classes/${classId}/students`,
      );
      setStudents(res.data);
    } catch (error) {
      console.error("Lỗi tải danh sách học sinh:", error);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const handleSelectSchool = (schoolId: number) => {
    setSelectedSchoolId(schoolId);
    setSelectedClassId(null);
    setStudents([]);
    fetchClasses(schoolId);
  };

  const handleSelectClass = (classId: number) => {
    setSelectedClassId(classId);
    fetchStudents(classId);
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim()) return;
    try {
      await axiosClient.post("/api/schools", {
        name: newSchoolName.trim(),
        address: newSchoolAddress.trim() || null,
      });
      setNewSchoolName("");
      setNewSchoolAddress("");
      showModal("Đã tạo trường thành công!", "success");
      fetchSchools();
    } catch (error: any) {
      showModal(
        error.response?.data?.message || "Không thể tạo trường!",
        "error",
      );
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !selectedSchoolId) return;
    try {
      await axiosClient.post("/api/schools/classes", {
        schoolId: selectedSchoolId,
        name: newClassName.trim(),
      });
      setNewClassName("");
      showModal("Đã tạo lớp thành công!", "success");
      fetchClasses(selectedSchoolId);
    } catch (error: any) {
      showModal(error.response?.data?.message || "Không thể tạo lớp!", "error");
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentIndex || !selectedClassId) return;
    try {
      await axiosClient.post(
        `/api/schools/classes/${selectedClassId}/students`,
        {
          fullName: newStudentName.trim(),
          gender: newStudentGender,
          indexNumber: Number(newStudentIndex),
        },
      );
      setNewStudentName("");
      setNewStudentIndex("");
      showModal("Đã thêm học sinh!", "success");
      fetchStudents(selectedClassId);
    } catch (error: any) {
      showModal(
        error.response?.data?.message || "Không thể thêm học sinh!",
        "error",
      );
    }
  };

  const handleRemoveStudent = async (studentId: number) => {
    if (!selectedClassId) return;
    try {
      await axiosClient.delete(`/api/schools/students/${studentId}`);
      showModal("Đã xóa học sinh khỏi lớp!", "success");
      fetchStudents(selectedClassId);
    } catch (error: any) {
      showModal(
        error.response?.data?.message || "Không thể xóa học sinh!",
        "error",
      );
    }
  };

  return (
    <div style={styles.pageBackground}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.eyebrow}>Trường mầm non</div>
          <h1 style={styles.pageTitle}>Quản lý trường / lớp / học sinh</h1>
        </header>

        {/* ===== CẤP 1: TRƯỜNG ===== */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>1. Trường</h2>
          <div style={styles.chipRow}>
            {schools.map((s) => (
              <button
                key={s.schoolId}
                style={{
                  ...styles.chip,
                  ...(selectedSchoolId === s.schoolId ? styles.chipActive : {}),
                }}
                onClick={() => handleSelectSchool(s.schoolId)}
              >
                {s.name}
              </button>
            ))}
          </div>
          <form onSubmit={handleCreateSchool} style={styles.inlineForm}>
            <input
              style={styles.inputSmall}
              placeholder="Tên trường mới"
              value={newSchoolName}
              onChange={(e) => setNewSchoolName(e.target.value)}
            />
            <input
              style={styles.inputSmall}
              placeholder="Địa chỉ (tùy chọn)"
              value={newSchoolAddress}
              onChange={(e) => setNewSchoolAddress(e.target.value)}
            />
            <button type="submit" style={styles.btnAdd}>
              + Thêm trường
            </button>
          </form>
        </section>

        {/* ===== CẤP 2: LỚP ===== */}
        {selectedSchoolId && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>2. Lớp học</h2>
            <div style={styles.chipRow}>
              {classes.map((c) => (
                <button
                  key={c.classId}
                  style={{
                    ...styles.chip,
                    ...(selectedClassId === c.classId ? styles.chipActive : {}),
                  }}
                  onClick={() => handleSelectClass(c.classId)}
                >
                  {c.name}
                </button>
              ))}
              {classes.length === 0 && (
                <span style={styles.stateTextInline}>Chưa có lớp nào</span>
              )}
            </div>
            <form onSubmit={handleCreateClass} style={styles.inlineForm}>
              <input
                style={styles.inputSmall}
                placeholder="Tên lớp mới (VD: Lớp Lá 1)"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
              />
              <button type="submit" style={styles.btnAdd}>
                + Thêm lớp
              </button>
            </form>
          </section>
        )}

        {/* ===== CẤP 3: HỌC SINH ===== */}
        {selectedClassId && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>3. Học sinh</h2>

            {students.length === 0 ? (
              <p style={styles.stateText}>Lớp chưa có học sinh nào.</p>
            ) : (
              <div style={styles.table}>
                <div style={styles.tableHeadRow}>
                  <span>STT</span>
                  <span>Họ tên</span>
                  <span>Cân gần nhất</span>
                  <span></span>
                </div>
                {students
                  .slice()
                  .sort((a, b) => a.indexNumber - b.indexNumber)
                  .map((s) => (
                    <div key={s.studentId} style={styles.tableRow}>
                      <span style={styles.rowIndex}>{s.indexNumber}</span>
                      <span style={styles.rowName}>
                        {s.fullName}
                        {!s.isActive && (
                          <span style={styles.inactiveTag}>Đã xóa</span>
                        )}
                      </span>
                      <span style={styles.rowWeight}>
                        {s.latestWeightKg !== null
                          ? `${s.latestWeightKg.toFixed(2)} kg`
                          : "—"}
                      </span>
                      <button
                        style={styles.btnRemove}
                        onClick={() => handleRemoveStudent(s.studentId)}
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
              </div>
            )}

            <form onSubmit={handleAddStudent} style={styles.inlineForm}>
              <input
                style={styles.inputSmall}
                placeholder="Họ tên học sinh"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
              />
              <select
                style={styles.inputSmall}
                value={newStudentGender}
                onChange={(e) => setNewStudentGender(e.target.value)}
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
              <input
                style={{ ...styles.inputSmall, maxWidth: "90px" }}
                type="number"
                placeholder="STT"
                value={newStudentIndex}
                onChange={(e) => setNewStudentIndex(e.target.value)}
              />
              <button type="submit" style={styles.btnAdd}>
                + Thêm học sinh
              </button>
            </form>
          </section>
        )}
      </div>

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
  accent: "#0B6E4F",
  muted: "#6B7268",
  hairline: "#D8DAD3",
  error: "#9A3324",
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
  container: { width: "100%", maxWidth: "760px" },
  header: {
    borderBottom: `1px solid ${COLORS.hairline}`,
    paddingBottom: "18px",
    marginBottom: "28px",
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
    fontSize: "24px",
    fontWeight: 700,
    color: COLORS.ink,
    margin: 0,
  },
  section: {
    marginBottom: "32px",
    paddingBottom: "24px",
    borderBottom: `1px solid ${COLORS.hairline}`,
  },
  sectionTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: COLORS.ink,
    marginBottom: "12px",
  },
  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "14px",
  },
  chip: {
    padding: "8px 16px",
    borderRadius: "999px",
    border: `1px solid ${COLORS.hairline}`,
    background: COLORS.paperRaised,
    color: COLORS.ink,
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT_SANS,
  },
  chipActive: {
    background: COLORS.accent,
    borderColor: COLORS.accent,
    color: "#ffffff",
  },
  stateTextInline: {
    fontSize: "13px",
    color: COLORS.muted,
    alignSelf: "center",
  },
  stateText: { color: COLORS.muted, fontSize: "14px", marginBottom: "14px" },
  inlineForm: { display: "flex", gap: "8px", flexWrap: "wrap" },
  inputSmall: {
    flex: "1 1 160px",
    padding: "9px 12px",
    borderRadius: "6px",
    border: `1px solid ${COLORS.hairline}`,
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: FONT_SANS,
    color: COLORS.ink,
    background: COLORS.paperRaised,
  },
  btnAdd: {
    padding: "9px 16px",
    borderRadius: "6px",
    border: "none",
    background: COLORS.accent,
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT_SANS,
    whiteSpace: "nowrap",
  },
  table: { marginBottom: "16px" },
  tableHeadRow: {
    display: "grid",
    gridTemplateColumns: "50px 1fr 120px 60px",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: COLORS.muted,
    padding: "8px 0",
    borderBottom: `1px solid ${COLORS.hairline}`,
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "50px 1fr 120px 60px",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: `1px solid ${COLORS.hairline}`,
  },
  rowIndex: {
    fontFamily: FONT_NUMBER,
    fontSize: "14px",
    fontWeight: 700,
    color: COLORS.muted,
  },
  rowName: { fontSize: "14px", color: COLORS.ink, fontWeight: 600 },
  rowWeight: {
    fontFamily: FONT_NUMBER,
    fontSize: "14px",
    fontWeight: 700,
    color: COLORS.ink,
  },
  inactiveTag: {
    marginLeft: "8px",
    fontSize: "10px",
    color: COLORS.error,
    border: `1px solid ${COLORS.error}`,
    borderRadius: "4px",
    padding: "1px 5px",
  },
  btnRemove: {
    padding: "5px 10px",
    borderRadius: "5px",
    border: `1px solid ${COLORS.error}`,
    background: "transparent",
    color: COLORS.error,
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT_SANS,
  },
};
