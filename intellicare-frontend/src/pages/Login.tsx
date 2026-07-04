import React, { useState } from 'react';
import { Navigate, useNavigate } from "react-router-dom";
import { useCustomAuth } from "../context/AuthContext";
import axiosClient from "../api/axiosClient";

const Login: React.FC = () => {
    const { isAuthenticated, login } = useCustomAuth();
    const navigate = useNavigate();

    const [loginType, setLoginType] = useState<'patient' | 'staff'>('patient');
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // State bổ sung để xử lý hiệu ứng Hover/Focus bằng React thuần
    const [focusedField, setFocusedField] = useState<'identifier' | 'password' | null>(null);
    const [isSubmitHovered, setIsSubmitHovered] = useState(false);

    if (isAuthenticated) return <Navigate to="/profile" replace />;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setIsLoading(true);

        try {
            const endpoint = loginType === 'staff' ? '/auth/staff/login' : '/auth/patient/login';
            const response = await axiosClient.post(endpoint, { identifier: identifier.trim(), password });
            const { token, role, fullName } = response.data;

            login(token, role, fullName);
            navigate('/profile');
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.response?.data?.message || err.response?.data || 'Sai tài khoản hoặc mật khẩu!');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={styles.wrapper}>
            {/* Đèn nền Aura phát sáng tạo hiệu ứng chiều sâu vô cực */}
            <div style={styles.glowLeft} />
            <div style={styles.glowRight} />

            <div style={styles.card}>
                {/* Khu vực Nhận diện Thương hiệu */}
                <div style={styles.brandSection}>
                    <div style={styles.logoContainer}>
                        <img src="/logo.jpg" alt="IntelliCare Logo" style={styles.brandLogo} />
                    </div>
                    <h2 style={styles.brandTitle}>INTELLICARE</h2>
                    <p style={styles.brandSubtitle}>HỆ THỐNG QUẢN LÝ SỨC KHỎE THÔNG MINH INTELLICARE</p>
                </div>

                {/* Chuyển đổi Đối tượng (Tabs dạng Viên nhộng cao cấp) */}
                <div style={styles.tabContainer}>
                    <button
                        type="button"
                        style={{
                            ...styles.tabBtn,
                            ...(loginType === 'patient' ? styles.tabBtnActive : {})
                        }}
                        onClick={() => { setLoginType('patient'); setIdentifier(''); setErrorMsg(''); }}
                    >
                        <span style={styles.tabIcon}>👤</span> Bệnh nhân
                    </button>
                    <button
                        type="button"
                        style={{
                            ...styles.tabBtn,
                            ...(loginType === 'staff' ? styles.tabBtnActive : {})
                        }}
                        onClick={() => { setLoginType('staff'); setIdentifier(''); setErrorMsg(''); }}
                    >
                        <span style={styles.tabIcon}>🩺</span> Nhân viên y tế
                    </button>
                </div>

                {/* Hộp thông báo lỗi thiết kế dạng viền Neon mỏng */}
                {errorMsg && (
                    <div style={styles.alertError}>
                        <span style={{ fontSize: '16px' }}>⚠️</span>
                        <div style={{ flex: 1 }}>{errorMsg}</div>
                    </div>
                )}

                {/* Form Đăng Nhập */}
                <form onSubmit={handleLogin}>

                    {/* Trường Tài khoản / SĐT / Email */}
                    <div style={styles.inputGroup}>
                        <label style={{
                            ...styles.inputLabel,
                            color: focusedField === 'identifier' ? '#0f766e' : '#475569'
                        }}>
                            {/* CHỈNH SỬA: Cập nhật label hiển thị cho Bệnh nhân */}
                            {loginType === 'patient' ? "Số điện thoại hoặc Email" : "Tài khoản nhân viên"}
                        </label>
                        <div style={styles.inputWrapper}>
                            <span style={{
                                ...styles.inputIcon,
                                color: focusedField === 'identifier' ? '#0d9488' : '#94a3b8'
                            }}>
                                {loginType === 'patient' ? (
                                    // Hiển thị icon thay đổi thông minh dựa theo dữ liệu người dùng nhập vào
                                    identifier.includes('@') ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                            <polyline points="22,6 12,13 2,6"/>
                                        </svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                        </svg>
                                    )
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                    </svg>
                                )}
                            </span>
                            <input
                                type="text"
                                style={{
                                    ...styles.inputField,
                                    ...(focusedField === 'identifier' ? styles.inputFieldFocus : {})
                                }}
                                /* CHỈNH SỬA: Cập nhật placeholder gợi ý */
                                placeholder={loginType === 'patient' ? "Nhập SĐT hoặc Email đã đăng ký..." : "Nhập tên tài khoản..."}
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                onFocus={() => setFocusedField('identifier')}
                                onBlur={() => setFocusedField(null)}
                                required
                            />
                        </div>
                    </div>

                    {/* Trường Mật khẩu */}
                    <div style={styles.inputGroup}>
                        <label style={{
                            ...styles.inputLabel,
                            color: focusedField === 'password' ? '#0f766e' : '#475569'
                        }}>Mật khẩu hệ thống</label>
                        <div style={styles.inputWrapper}>
                            <span style={{
                                ...styles.inputIcon,
                                color: focusedField === 'password' ? '#94a3b8' : '#94a3b8'
                            }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                            </span>
                            <input
                                type="password"
                                style={{
                                    ...styles.inputField,
                                    ...(focusedField === 'password' ? styles.inputFieldFocus : {})
                                }}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                                required
                            />
                        </div>
                    </div>

                    {/* Nút Đăng nhập Gradient đổ bóng kép */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            ...styles.btnSubmit,
                            ...(isLoading ? styles.btnSubmitDisabled : {}),
                            ...(isSubmitHovered && !isLoading ? styles.btnSubmitHover : {})
                        }}
                        onMouseEnter={() => setIsSubmitHovered(true)}
                        onMouseLeave={() => setIsSubmitHovered(false)}
                    >
                        {isLoading ? (
                            <div style={styles.loaderContainer}>
                                <div style={styles.spinner}></div>
                                <span>ĐANG XÁC THỰC...</span>
                            </div>
                        ) : "VÀO HỆ THỐNG"}
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- ĐỐI TƯỢNG STYLES BIOTECH CHUẨN REACT (Giữ nguyên giao diện của bạn) ---
const styles: { [key: string]: React.CSSProperties } = {
    wrapper: {
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'radial-gradient(circle at 50% 50%, #f0fdfa 0%, #e2e8f0 100%)',
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        padding: '20px',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
    },
    glowLeft: {
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'rgba(20, 184, 166, 0.25)',
        top: '-10%',
        left: '-10%',
        filter: 'blur(80px)',
        pointerEvents: 'none',
    },
    glowRight: {
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'rgba(16, 185, 129, 0.2)',
        bottom: '-10%',
        right: '-10%',
        filter: 'blur(80px)',
        pointerEvents: 'none',
    },
    card: {
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(16px)',
        width: '100%',
        maxWidth: '450px',
        borderRadius: '32px',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.03), 0 20px 50px -12px rgba(15, 23, 42, 0.08)',
        padding: '45px 40px',
        boxSizing: 'border-box',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        position: 'relative',
        zIndex: 1,
    },
    brandSection: {
        textAlign: 'center',
        marginBottom: '35px',
    },
    logoContainer: {
        display: 'inline-block',
        padding: '8px',
        background: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 8px 20px rgba(13, 148, 136, 0.1)',
        marginBottom: '16px',
    },
    brandLogo: {
        width: '100px',
        height: '100px',
        borderRadius: '18px',
        objectFit: 'cover',
    },
    brandTitle: {
        fontSize: '28px',
        fontWeight: 900,
        color: '#111827',
        margin: 0,
        letterSpacing: '1px',
        background: 'linear-gradient(135deg, #0f766e 0%, #059669 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    brandSubtitle: {
        fontSize: '12px',
        fontWeight: 600,
        color: '#64748b',
        marginTop: '6px',
        letterSpacing: '0.5px',
    },
    tabContainer: {
        display: 'flex',
        background: '#f1f5f9',
        padding: '4px',
        borderRadius: '16px',
        marginBottom: '30px',
        border: '1px solid #e2e8f0',
    },
    tabBtn: {
        flex: 1,
        border: 'none',
        background: 'transparent',
        padding: '12px 8px',
        fontSize: '14px',
        fontWeight: 700,
        color: '#64748b',
        cursor: 'pointer',
        borderRadius: '12px',
        transition: 'all 0.25s ease',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '6px',
    },
    tabIcon: {
        fontSize: '16px',
    },
    tabBtnActive: {
        background: '#ffffff',
        color: '#0f766e',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.02)',
    },
    inputGroup: {
        marginBottom: '22px',
        textAlign: 'left',
    },
    inputLabel: {
        display: 'block',
        fontSize: '13px',
        fontWeight: 700,
        marginBottom: '8px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        transition: 'color 0.2s ease',
    },
    inputWrapper: {
        position: 'relative',
    },
    inputIcon: {
        position: 'absolute',
        left: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        pointerEvents: 'none',
        transition: 'color 0.2s ease',
    },
    inputField: {
        width: '100%',
        padding: '15px 16px 15px 48px',
        fontSize: '15px',
        border: '2px solid #e2e8f0',
        borderRadius: '14px',
        background: '#f8fafc',
        color: '#0f172a',
        boxSizing: 'border-box',
        transition: 'all 0.25s ease',
        fontWeight: '500',
    },
    inputFieldFocus: {
        outline: 'none',
        borderColor: '#0d9488',
        background: '#ffffff',
        boxShadow: '0 0 0 4px rgba(13, 148, 136, 0.15)',
    },
    alertError: {
        background: '#fff5f5',
        border: '1px solid #fee2e2',
        color: '#b91c1c',
        padding: '14px 16px',
        borderRadius: '14px',
        fontSize: '14px',
        fontWeight: 600,
        marginBottom: '25px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.03)',
    },
    btnSubmit: {
        width: '100%',
        padding: '16px',
        border: 'none',
        borderRadius: '14px',
        fontSize: '16px',
        fontWeight: 800,
        color: '#ffffff',
        cursor: 'pointer',
        background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
        boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
        transition: 'all 0.25s ease',
        marginTop: '10px',
        letterSpacing: '0.5px',
        fontFamily: "'Segoe UI', Roboto, sans-serif"
    },
    btnSubmitHover: {
        transform: 'translateY(-1.5px)',
        boxShadow: '0 8px 20px rgba(13, 148, 136, 0.4)',
    },
    btnSubmitDisabled: {
        background: '#cbd5e1',
        boxShadow: 'none',
        cursor: 'not-allowed',
        color: '#64748b',
    },
    loaderContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '10px',
    },
    spinner: {
        width: '18px',
        height: '18px',
        border: '2.5px solid rgba(255,255,255,0.3)',
        borderTop: '2.5px solid #ffffff',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    footerText: {
        textAlign: 'center',
        marginTop: '28px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#94a3b8',
    },
};

export default Login;