import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext.tsx"; // Đảm bảo đúng đường dẫn

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        {/* AuthProvider PHẢI bọc bên ngoài App */}
        <AuthProvider>
            <App />
        </AuthProvider>
    </StrictMode>,
);