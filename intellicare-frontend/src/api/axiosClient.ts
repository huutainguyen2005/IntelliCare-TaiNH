import axios from "axios";

const axiosClient = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "https://intellicare-tainh.onrender.com",
  headers: {
    "Content-Type": "application/json; charset=UTF-8",
  },
});
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      // Đảm bảo headers tồn tại trước khi gán
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Kiosk/ESP32 gọi /api/measurements/** không có JWT (không đăng nhập) -
    // gắn kèm khóa thiết bị để Backend chấp nhận request.
    if (config.url?.includes("/api/measurements/")) {
      config.headers = config.headers || {};
      config.headers["X-Device-Key"] =
        import.meta.env.VITE_DEVICE_API_KEY || "";
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
export default axiosClient;
