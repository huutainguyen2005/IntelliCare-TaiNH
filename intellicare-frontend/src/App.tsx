import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useCustomAuth } from "./context/AuthContext";
import Scanner from "./pages/Scanner";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Navbar from "./components/Navbar";
import StaffDashboard from "./pages/StaffDashboard";
import PatientDetail from "./pages/PatientDetail";
import PatientActivation from "./pages/PatientActivation"; 

function App() {
  const { isAuthenticated, user } = useCustomAuth();

  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Navigate to="/activate" replace />} />
        <Route path="/scanner" element={<Scanner />} />
        <Route path="/login" element={<Login />} />
        <Route path="/activate" element={<PatientActivation />} />

        <Route
          path="/profile"
          element={
            isAuthenticated ? <Profile /> : <Navigate to="/login" replace />
          }
        />

        {/* ĐỔI ĐIỀU KIỆN ROUTE: Cho phép truy cập nếu không phải ROLE_PATIENT */}
        <Route
          path="/dashboard"
          element={
            isAuthenticated && user?.role !== "ROLE_PATIENT" ? (
              <StaffDashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/patient-detail/:id"
          element={
            isAuthenticated && user?.role !== "ROLE_PATIENT" ? (
              <PatientDetail />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
