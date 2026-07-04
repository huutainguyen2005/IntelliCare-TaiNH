import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';

interface PatientSummary {
    patientId: number;
    fullName: string;
    phoneNumber: string;
}

interface WeightLog {
    logId: number;
    measuredAt: string;
    weightKg: number;
}

interface PatientDetailData {
    patientCode: string;
    fullName: string;
    phoneNumber: string;
    dob: string;
    faceImageUrl: string | null;
    weightLog: WeightLog[];
}

export default function StaffDashboard() {
    const [patients, setPatients] = useState<PatientSummary[]>([]);
    const [search, setSearch] = useState('');

    // State điều khiển trạng thái Popup & Hiệu ứng tương tác UI
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<PatientDetailData | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [showLogs, setShowLogs] = useState(false);

    const [isInputFocused, setIsInputFocused] = useState(false);
    const [isLogsBtnHovered, setIsLogsBtnHovered] = useState(false);
    const [isCloseHovered, setIsCloseHovered] = useState(false);

    // 1. TỐI ƯU TÀI NGUYÊN TÌM KIẾM
    useEffect(() => {
        if (!search.trim()) {
            setPatients([]);
            return;
        }

        let isActive = true;
        const fetchPatients = async () => {
            try {
                const res = await axiosClient.get(`/api/patients/search?keyword=${search}`);
                if (isActive) setPatients(res.data);
            } catch (error) {
                console.error("Lỗi hệ thống khi tìm kiếm bệnh nhân:", error);
            }
        };

        const timeoutId = setTimeout(() => { fetchPatients(); }, 500);
        return () => {
            isActive = false;
            clearTimeout(timeoutId);
        };
    }, [search]);

    // 2. KHÓA TRẠNG THÁI CUỘN MÀN HÌNH CHÍNH PHÍA SAU KHI MỞ MODAL
    useEffect(() => {
        if (isModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isModalOpen]);

    const handleOpenModal = async (patientId: number) => {
        setIsModalOpen(true);
        setLoadingDetail(true);
        setShowLogs(false);

        try {
            const res = await axiosClient.get(`/api/patients/${patientId}`);
            setSelectedPatient(res.data);
        } catch (error) {
            console.error("Lỗi lấy dữ liệu chi tiết từ máy chủ:", error);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedPatient(null);
        setShowLogs(false);
    };

    // Thuật toán kiểm tra rủi ro sức khỏe
    const evaluateLogRisk = (targetLog: WeightLog, allLogs: WeightLog[]) => {
        const targetDate = new Date(targetLog.measuredAt);
        const oneWeekAgo = new Date(targetDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(targetDate.getTime() - 30 * 24 * 60 * 60 * 1000);

        for (const log of allLogs) {
            const logDate = new Date(log.measuredAt);
            if (logDate >= targetDate) continue;

            const weightDiff = Math.abs(targetLog.weightKg - log.weightKg);
            const formattedLogDate = logDate.toLocaleDateString('vi-VN');

            if (logDate >= oneWeekAgo && weightDiff > 2) {
                return { isRisk: true, msg: `Trọng lượng thay đổi bất thường (> 2kg trong 1 tuần so với ngày ${formattedLogDate})` };
            }

            if (logDate >= oneMonthAgo) {
                const fivePercentLimit = log.weightKg * 0.05;
                if (weightDiff > fivePercentLimit) {
                    return { isRisk: true, msg: `Trọng lượng vượt ngưỡng an toàn (> 5% cơ thể trong 1 tháng so với ngày ${formattedLogDate})` };
                }
            }
        }
        return { isRisk: false, msg: "" };
    };

    const sortedLogs = selectedPatient?.weightLog
        ? [...selectedPatient.weightLog].sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())
        : [];
    const latestLog = sortedLogs.length > 0 ? sortedLogs[0] : null;
    const latestRiskStatus = latestLog ? evaluateLogRisk(latestLog, sortedLogs) : { isRisk: false, msg: "" };

    return (
        <div style={styles.pageBackground}>

            {/* THÀNH PHẦN 1: KHUNG TRA CỨU CHÍNH */}
            <div style={styles.container}>
                <h2 style={styles.title}>QUẢN LÝ BỆNH NHÂN</h2>

                <input
                    style={{
                        ...styles.inputField,
                        ...(isInputFocused ? styles.inputFieldFocus : {})
                    }}
                    placeholder="🔍 Nhập chính xác tên bệnh nhân hoặc SĐT để tra cứu..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                />

                {!search.trim() && (
                    <div style={styles.emptyStateContainer}>
                        <p style={styles.emptyStateText}>🧬 Hệ thống phân tích sinh trắc học đã sẵn sàng. Vui lòng nhập từ khóa.</p>
                    </div>
                )}

                <div style={{ marginTop: '24px' }}>
                    {patients.map(p => (
                        <div key={p.patientId} style={styles.patientCard}>
                            <div>
                                <div style={styles.patientName}>{p.fullName}</div>
                                <div style={styles.patientPhone}>Liên hệ: {p.phoneNumber}</div>
                            </div>
                            <button
                                onClick={() => handleOpenModal(p.patientId)}
                                style={styles.btnViewProfile}
                            >
                                XEM HỒ SƠ
                            </button>
                        </div>
                    ))}

                    {search.trim() !== '' && patients.length === 0 && (
                        <p style={styles.errorResultText}>📭 Không tìm thấy hồ sơ bệnh nhân phù hợp trên hệ thống.</p>
                    )}
                </div>
            </div>

            {/* THÀNH PHẦN 2: MODAL LỚP PHỦ (ĐÃ ĐƯỢC ĐƯA RA NGOÀI ĐỂ FIXED TOÀN VIEWPORT CHUẨN 100%) */}
            {isModalOpen && (
                <div style={styles.modalOverlay} onClick={handleCloseModal}>
                    <div style={styles.modalContentSplit} onClick={e => e.stopPropagation()}>

                        {/* Nút Đóng */}
                        <button
                            style={{
                                ...styles.modalCloseBtn,
                                ...(isCloseHovered ? styles.modalCloseBtnHover : {})
                            }}
                            onClick={handleCloseModal}
                            onMouseEnter={() => setIsCloseHovered(true)}
                            onMouseLeave={() => setIsCloseHovered(false)}
                        >
                            &times;
                        </button>

                        {loadingDetail ? (
                            <div style={styles.loadingWrapper}>
                                <div style={styles.spinner}></div>
                                <h3 style={styles.loadingText}>Đang truy xuất hồ sơ y tế từ thiết bị IoT...</h3>
                            </div>
                        ) : selectedPatient ? (
                            <>
                                {/* PANEL TRÁI: Nội dung bệnh án & Lịch sử cân đo */}
                                <div style={styles.modalLeftInfo}>
                                    <h2 style={styles.modalLeftTitle}>THÔNG TIN BỆNH ÁN</h2>

                                    <div style={styles.infoSection}>
                                        <div style={styles.infoRow}>
                                            <span style={styles.infoLabel}>Mã số định danh</span>
                                            <span style={styles.infoValue}>{selectedPatient.patientCode}</span>
                                        </div>
                                        <div style={styles.infoRow}>
                                            <span style={styles.infoLabel}>Họ và tên</span>
                                            <span style={styles.infoValue}>{selectedPatient.fullName}</span>
                                        </div>
                                        <div style={styles.infoRow}>
                                            <span style={styles.infoLabel}>Số điện thoại</span>
                                            <span style={styles.infoValue}>{selectedPatient.phoneNumber}</span>
                                        </div>
                                        <div style={styles.infoRow}>
                                            <span style={styles.infoLabel}>Ngày tháng năm sinh</span>
                                            <span style={styles.infoValue}>{selectedPatient.dob}</span>
                                        </div>
                                    </div>

                                    <h3 style={styles.subTitleSection}>TRẠNG THÁI LÂM SÀNG GẦN NHẤT</h3>

                                    <div style={{
                                        ...styles.riskWidget,
                                        ...(latestRiskStatus.isRisk ? styles.riskWidgetDanger : styles.riskWidgetSafe)
                                    }}>
                                        <div style={styles.riskWidgetHeader}>
                                            <span style={{
                                                ...styles.riskLabel,
                                                color: latestRiskStatus.isRisk ? '#b91c1c' : '#0f766e'
                                            }}>
                                                {latestRiskStatus.isRisk ? '⚠️ CẢNH BÁO:' : '🩺 CHỈ SỐ GẦN NHẤT:'}
                                            </span>
                                            <span style={{
                                                ...styles.riskWeightValue,
                                                color: latestRiskStatus.isRisk ? '#b91c1c' : '#0d9488'
                                            }}>
                                                {latestLog ? `${latestLog.weightKg} kg` : 'Chưa có dữ liệu'}
                                            </span>
                                        </div>
                                        {latestRiskStatus.isRisk && (
                                            <div style={styles.riskMessage}>
                                                {latestRiskStatus.msg}
                                            </div>
                                        )}
                                    </div>

                                    {sortedLogs.length > 0 ? (
                                        <>
                                            <button
                                                onClick={() => setShowLogs(!showLogs)}
                                                style={{
                                                    ...styles.btnHistoryToggle,
                                                    ...(isLogsBtnHovered ? styles.btnHistoryToggleHover : {})
                                                }}
                                                onMouseEnter={() => setIsLogsBtnHovered(true)}
                                                onMouseLeave={() => setIsLogsBtnHovered(false)}
                                            >
                                                {showLogs ? "🔒 ẨN CHI TIẾT LỊCH SỬ" : "📊 XEM TOÀN BỘ LỊCH SỬ CÂN NẶNG"}
                                            </button>

                                            {showLogs && (
                                                <div style={styles.timelineContainer}>
                                                    {sortedLogs.map((log: WeightLog) => {
                                                        const logRisk = evaluateLogRisk(log, sortedLogs);
                                                        return (
                                                            <div
                                                                key={log.logId}
                                                                style={{
                                                                    ...styles.timelineCard,
                                                                    ...(logRisk.isRisk ? styles.timelineCardDanger : styles.timelineCardNormal)
                                                                }}
                                                            >
                                                                <div style={styles.timelineTimeBlock}>
                                                                    <span style={{ color: logRisk.isRisk ? '#991b1b' : '#334155', fontWeight: 600 }}>
                                                                        {new Date(log.measuredAt).toLocaleString('vi-VN')}
                                                                    </span>
                                                                    {logRisk.isRisk && (
                                                                        <span style={styles.dangerTag}>Nguy cơ</span>
                                                                    )}
                                                                </div>
                                                                <div style={{
                                                                    ...styles.timelineWeight,
                                                                    color: logRisk.isRisk ? '#dc2626' : '#0f766e'
                                                                }}>
                                                                    {log.weightKg} kg
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <p style={styles.noDataText}>ℹ️ Chưa ghi nhận dữ liệu đo đạc nào từ hệ thống trạm cân.</p>
                                    )}
                                </div>

                                {/* PANEL PHẢI: Ảnh đại diện kéo dài đồng bộ */}
                                <div
                                    style={{
                                        ...styles.modalRightImage,
                                        ...(selectedPatient.faceImageUrl
                                            ? { backgroundImage: `url(${selectedPatient.faceImageUrl})` }
                                            : styles.modalRightImagePlaceholder)
                                    }}
                                >
                                    {!selectedPatient.faceImageUrl && <span style={{ fontSize: '64px' }}>👤</span>}
                                </div>
                            </>
                        ) : (
                            <div style={styles.loadingWrapper}>
                                <h3 style={{ color: '#b91c1c' }}>Không tìm thấy dữ liệu hồ sơ hợp lệ!</h3>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// --- CSS STYLES ĐÃ ĐƯỢC TINH CHỈNH ĐỂ TRÁNH TRÙNG LẶP SCROLLBARS ---
const styles: { [key: string]: React.CSSProperties } = {
    pageBackground: {
        minHeight: '100vh',
        background: 'radial-gradient(circle at 50% 50%, #f0fdf4 0%, #e2e8f0 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '50px 20px',
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        boxSizing: 'border-box',
        position: 'relative',
    },
    container: {
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        width: '100%',
        maxWidth: '850px',
        borderRadius: '32px',
        padding: '40px',
        boxSizing: 'border-box',
        boxShadow: '0 20px 50px -12px rgba(15, 23, 42, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
    },
    title: {
        fontSize: '26px',
        fontWeight: 900,
        margin: '0 0 24px 0',
        letterSpacing: '0.5px',
        background: 'linear-gradient(135deg, #0f766e 0%, #059669 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textAlign: 'center',
    },
    inputField: {
        width: '100%',
        padding: '16px 20px',
        fontSize: '15px',
        fontWeight: 600,
        borderRadius: '16px',
        border: '2px solid #cbd5e1',
        background: '#ffffff',
        color: '#1e293b',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'all 0.2s ease',
    },
    inputFieldFocus: {
        borderColor: '#0d9488',
        boxShadow: '0 0 0 4px rgba(13, 148, 136, 0.15)',
    },
    emptyStateContainer: {
        marginTop: '40px',
        textAlign: 'center',
    },
    emptyStateText: {
        fontSize: '15px',
        fontWeight: 600,
        color: '#64748b',
        fontStyle: 'italic',
    },
    patientCard: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#ffffff',
        padding: '20px 24px',
        borderRadius: '20px',
        marginBottom: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.01)',
        boxSizing: 'border-box',
    },
    patientName: {
        fontSize: '18px',
        fontWeight: 700,
        color: '#0f172a',
    },
    patientPhone: {
        fontSize: '14px',
        fontWeight: 600,
        color: '#64748b',
        marginTop: '4px',
    },
    btnViewProfile: {
        background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
        color: '#ffffff',
        fontWeight: 800,
        fontSize: '13px',
        padding: '12px 24px',
        borderRadius: '12px',
        border: 'none',
        cursor: 'pointer',
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        boxShadow: '0 4px 12px rgba(13, 148, 136, 0.15)',
        transition: 'all 0.2s ease',
    },
    errorResultText: {
        textAlign: 'center',
        fontWeight: 700,
        fontSize: '15px',
        color: '#ef4444',
        marginTop: '24px',
    },
    // HOÀN TOÀN GIẢI PHÓNG ĐỘC LẬP TẠI ĐÂY:
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        overflowY: 'auto',        // Cho phép cuộn mượt lớp nền khi modal dài ra
        zIndex: 9999,             // Đảm bảo đè lên toàn bộ thanh điều hướng header của app
        padding: '60px 20px',
        boxSizing: 'border-box',
    },
    modalContentSplit: {
        background: '#ffffff',
        width: '100%',
        maxWidth: '900px',
        height: 'auto',
        borderRadius: '28px',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
        boxSizing: 'border-box',
    },
    modalCloseBtn: {
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(15, 23, 42, 0.05)',
        border: 'none',
        fontSize: '28px',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b',
        cursor: 'pointer',
        zIndex: 10,
        transition: 'all 0.2s ease',
    },
    modalCloseBtnHover: {
        background: '#fee2e2',
        color: '#ef4444',
    },
    modalLeftInfo: {
        flex: '0 0 60%',
        padding: '40px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
    },
    modalLeftTitle: {
        fontSize: '22px',
        fontWeight: 900,
        margin: '0 0 20px 0',
        background: 'linear-gradient(135deg, #0f766e 0%, #059669 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    infoSection: {
        background: '#f8fafc',
        borderRadius: '16px',
        padding: '16px 20px',
        border: '1px solid #edf2f7',
    },
    infoRow: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: '1px solid #edf2f7',
    },
    infoLabel: {
        fontSize: '13px',
        fontWeight: 700,
        color: '#64748b',
        textTransform: 'uppercase',
    },
    infoValue: {
        fontSize: '14px',
        fontWeight: 600,
        color: '#0f172a',
    },
    subTitleSection: {
        fontSize: '14px',
        fontWeight: 800,
        color: '#334155',
        letterSpacing: '0.5px',
        marginTop: '24px',
        marginBottom: '12px',
        borderBottom: '2px solid #f1f5f9',
        paddingBottom: '6px',
    },
    riskWidget: {
        padding: '16px',
        borderRadius: '16px',
        marginBottom: '16px',
        boxSizing: 'border-box',
    },
    riskWidgetSafe: {
        background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
        border: '1px solid rgba(13, 148, 136, 0.2)',
    },
    riskWidgetDanger: {
        background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
        border: '2px solid #ef4444',
    },
    riskWidgetHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    riskLabel: {
        fontSize: '13px',
        fontWeight: 800,
    },
    riskWeightValue: {
        fontSize: '26px',
        fontWeight: 900,
    },
    riskMessage: {
        color: '#991b1b',
        fontSize: '13px',
        marginTop: '8px',
        fontWeight: 600,
        fontStyle: 'italic',
        lineHeight: 1.4,
    },
    btnHistoryToggle: {
        width: '100%',
        padding: '12px',
        background: 'transparent',
        border: '2px solid #0d9488',
        color: '#0d9488',
        borderRadius: '12px',
        fontSize: '13px',
        fontWeight: 800,
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    btnHistoryToggleHover: {
        background: 'rgba(13, 148, 136, 0.05)',
    },
    timelineContainer: {
        marginTop: '12px',
    },
    timelineCard: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 16px',
        borderRadius: '10px',
        marginBottom: '8px',
        boxSizing: 'border-box',
    },
    timelineCardNormal: {
        background: '#f1f5f9',
        borderLeft: '4px solid #3b82f6',
    },
    timelineCardDanger: {
        background: '#fef2f2',
        borderLeft: '4px solid #ef4444',
        borderTop: '1px solid #fee2e2',
        borderBottom: '1px solid #fee2e2',
        borderRight: '1px solid #fee2e2',
    },
    timelineTimeBlock: {
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    dangerTag: {
        fontSize: '11px',
        padding: '2px 6px',
        backgroundColor: '#ef4444',
        color: '#ffffff',
        borderRadius: '4px',
        fontWeight: 700,
    },
    timelineWeight: {
        fontSize: '16px',
        fontWeight: 800,
    },
    modalRightImage: {
        flex: '0 0 40%',
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
    },
    modalRightImagePlaceholder: {
        background: '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    noDataText: {
        fontStyle: 'italic',
        color: '#64748b',
        textAlign: 'center',
        fontSize: '13px',
    },
    loadingWrapper: {
        width: '100%',
        padding: '60px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        color: '#0f766e',
        fontSize: '16px',
        fontWeight: 700,
        marginTop: '16px',
    },
    spinner: {
        width: '28px',
        height: '28px',
        border: '3px solid #e2e8f0',
        borderTop: '3px solid #0d9488',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
};