import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";

import Login from "./pages/Login.jsx";
import Operations from "./pages/Operations.jsx";
import Reports from "./pages/Reports.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Header from "./components/Header.jsx";
import Customers from "./pages/Customers.jsx";
import Salespersons from "./pages/Salespersons.jsx";
import Transactions from "./pages/Transactions.jsx";

// Yeni sayfalar
import RetMembers from "./pages/RetMembers.jsx";
import RetAssignment from "./pages/RetAssignment.jsx";
import RetAssignmentsList from "./pages/RetAssignmentsList.jsx"; // 🔹 RET atamaları listesi
import RetReports from "./pages/RetReports.jsx";                 // 🔹 RET raporları (GM)
import Retention from "./pages/Retention.jsx";                   // 🔹 RET müşterisi yatırım sayfası (yeni)

export default function App() {
  return (
    <Router>
      <AppInner />
    </Router>
  );
}

function AppInner() {
  const location = useLocation();
  const isLogin = location.pathname === "/login";

  return (
    <>
      {/* Login sayfasında Header göstermiyoruz */}
      {!isLogin && <Header />}

      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Ana sayfa yönlendirme */}
        <Route path="/" element={<Navigate to="/operations" replace />} />

        {/* Operations: her iki rol */}
        <Route
          path="/operations"
          element={
            <ProtectedRoute allowedRoles={["OPERASYON_MUDURU", "GENEL_MUDUR"]}>
              <Operations />
            </ProtectedRoute>
          }
        />

        {/* Customers: her iki rol */}
        <Route
          path="/customers"
          element={
            <ProtectedRoute allowedRoles={["OPERASYON_MUDURU", "GENEL_MUDUR"]}>
              <Customers />
            </ProtectedRoute>
          }
        />

        {/* Salespersons: her iki rol */}
        <Route
          path="/salespersons"
          element={
            <ProtectedRoute allowedRoles={["OPERASYON_MUDURU", "GENEL_MUDUR"]}>
              <Salespersons />
            </ProtectedRoute>
          }
        />

        {/* Transactions: her iki rol */}
        <Route
          path="/transactions"
          element={
            <ProtectedRoute allowedRoles={["OPERASYON_MUDURU", "GENEL_MUDUR"]}>
              <Transactions />
            </ProtectedRoute>
          }
        />

        {/* 🔹 Retention: her iki rol (backend guard kuralları işleyecek) */}
        <Route
          path="/retention"
          element={
            <ProtectedRoute allowedRoles={["OPERASYON_MUDURU", "GENEL_MUDUR"]}>
              <Retention />
            </ProtectedRoute>
          }
        />

        {/* Raporlar: sadece Genel Müdür */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={["GENEL_MUDUR"]}>
              <Reports />
            </ProtectedRoute>
          }
        />

        {/* 🔹 RET Raporları: sadece Genel Müdür */}
        <Route
          path="/ret-reports"
          element={
            <ProtectedRoute allowedRoles={["GENEL_MUDUR"]}>
              <RetReports />
            </ProtectedRoute>
          }
        />

        {/* RET Grubu: sadece Operasyon Müdürü */}
        <Route
          path="/ret-members"
          element={
            <ProtectedRoute allowedRoles={["OPERASYON_MUDURU"]}>
              <RetMembers />
            </ProtectedRoute>
          }
        />

        {/* RET Atama (adaylardan atama): sadece Genel Müdür */}
        <Route
          path="/ret-assignment"
          element={
            <ProtectedRoute allowedRoles={["GENEL_MUDUR"]}>
              <RetAssignment />
            </ProtectedRoute>
          }
        />

        {/* RET Atamaları listesi: sadece Genel Müdür */}
        <Route
          path="/ret-assignments"
          element={
            <ProtectedRoute allowedRoles={["GENEL_MUDUR"]}>
              <RetAssignmentsList />
            </ProtectedRoute>
          }
        />

        {/* Yakalanmayanlar */}
        <Route path="*" element={<Navigate to="/operations" replace />} />
      </Routes>
    </>
  );
}
