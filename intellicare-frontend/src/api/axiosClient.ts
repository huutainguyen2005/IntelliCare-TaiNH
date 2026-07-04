import axios from "axios";

// Lấy địa chỉ IP hiện tại của trình duyệt (localhost hoặc 192.168.x.x)
const currentHost = window.location.hostname;

const axiosClient = axios.create({
  // Tự động ghép IP với port 8080 của Backend
  baseURL: `http://${currentHost}:8080`,
  headers: {
    "Content-Type": "application/json",
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
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
export default axiosClient;
