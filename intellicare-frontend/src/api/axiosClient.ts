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
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
export default axiosClient;
