import React, { useEffect, useState } from 'react';

// Định nghĩa kiểu dữ liệu trả về từ API của BE
interface XiaomiData {
    weightKg?: number;
    heartRate?: number;
    impedanceOhm?: number;
    deviceTimestamp?: number;
    complete?: boolean;
    fatPercent?: number;
    waterPercent?: number;
    muscleMassKg?: number;
    boneMassKg?: number;
    visceralFat?: number;
    bmi?: number;
    bmrKcalDay?: number;
}

const ScannerXiaomi: React.FC = () => {
    const [data, setData] = useState<XiaomiData | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Hàm format số
    const fmt = (v: number | undefined | null, decimals: number, unit = '') => {
        if (v === null || v === undefined || Number.isNaN(v)) return '--';
        return Number(v).toFixed(decimals) + unit;
    };

    useEffect(() => {
        const fetchLatestData = async () => {
            try {
                // Đảm bảo URL trỏ đúng tới Backend Spring Boot của bạn (port 8080)
                const res = await fetch('http://localhost:8080/api/latest');
                if (!res.ok) throw new Error('HTTP ' + res.status);

                const responseData: XiaomiData = await res.json();
                setData(responseData);
                setError(null);
            } catch (err: any) {
                setError('Mất kết nối Server: ' + err.message);
                console.error(err);
            }
        };

        fetchLatestData();
        const intervalId = setInterval(fetchLatestData, 1000);
        return () => clearInterval(intervalId);
    }, []);

    let statusText = 'Đang chờ dữ liệu...';
    if (error) {
        statusText = error;
    } else if (data?.deviceTimestamp) {
        const time = new Date(data.deviceTimestamp * 1000).toLocaleTimeString('vi-VN');
        statusText = `Cập nhật: ${time} ${data.complete ? '' : '(đang đo...)'}`;
    }

    return (
        <div className="xiaomi-wrapper">
            {/* Nhúng trực tiếp CSS vào Component */}
            <style>{`
                .xiaomi-wrapper {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    background: #f0fdfa;
                    padding-top: 60px;
                    min-height: 100vh;
                }
                .xiaomi-box {
                    background: white;
                    width: 420px;
                    margin: auto;
                    padding: 40px;
                    border-radius: 20px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, .1);
                }
                .xiaomi-box h1 {
                    color: #0f766e;
                    margin-bottom: 10px;
                }
                .xiaomi-box .weight {
                    font-size: 80px;
                    font-weight: bold;
                    color: #115e59;
                    margin: 10px 0 25px;
                }
                .xiaomi-box .fat {
                    font-size: 36px;
                    font-weight: bold;
                    color: #0d9488;
                    margin-bottom: 25px;
                }
                .xiaomi-box .fat small {
                    font-size: 15px;
                    color: #94a3b8;
                    font-weight: normal;
                    display: block;
                }
                .xiaomi-box .grid-info {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px 18px;
                    font-size: 16px;
                    color: #64748b;
                    text-align: left;
                }
                .xiaomi-box .grid-info strong {
                    color: #334155;
                    float: right;
                }
                .xiaomi-box .status {
                    margin-top: 25px;
                    font-size: 13px;
                    color: #94a3b8;
                }
                .xiaomi-box .status.err {
                    color: #dc2626;
                }
            `}</style>

            <div className="xiaomi-box">
                <h1>INTELLICARE</h1>

                <div className="weight">
                    {fmt(data?.weightKg, 1)} <span style={{ fontSize: '30px' }}>kg</span>
                </div>

                {/*<div className="fat">*/}
                {/*    <span>{fmt(data?.fatPercent, 1)}</span> %*/}
                {/*    <small>tỉ lệ mỡ cơ thể</small>*/}
                {/*</div>*/}

                {/*<div className="grid-info">*/}
                {/*    <div>Nhịp tim <strong>{data?.heartRate ?? '--'} bpm</strong></div>*/}
                {/*    <div>BMI <strong>{fmt(data?.bmi, 1)}</strong></div>*/}
                {/*    <div>Nước <strong>{fmt(data?.waterPercent, 1, ' %')}</strong></div>*/}
                {/*    <div>Cơ <strong>{fmt(data?.muscleMassKg, 1, ' kg')}</strong></div>*/}
                {/*    <div>Mỡ nội tạng <strong>{fmt(data?.visceralFat, 1)}</strong></div>*/}
                {/*    <div>Trở kháng <strong>{fmt(data?.impedanceOhm, 1, ' Ω')}</strong></div>*/}
                {/*</div>*/}

                <div className={`status ${error ? 'err' : ''}`}>
                    {statusText}
                </div>
            </div>
        </div>
    );
};

export default ScannerXiaomi;