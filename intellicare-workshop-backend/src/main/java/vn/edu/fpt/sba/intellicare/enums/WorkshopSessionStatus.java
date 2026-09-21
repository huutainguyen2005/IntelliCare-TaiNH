package vn.edu.fpt.sba.intellicare.enums;

public enum WorkshopSessionStatus {
    AwaitingStart, // Đã điền form, chưa bấm "Bắt đầu cân"
    Pending,       // Đã bấm, đang chờ dữ liệu từ cân
    Completed      // Đã có kết quả, đã/đang gửi email
}
