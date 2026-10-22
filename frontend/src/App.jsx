import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import DashboardLayout from "./components/DashboardLayout";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import DashboardOverview from "./pages/DashboardOverview";
import ReportUpload from "./pages/ReportUpload";
import ReportExplainer from "./pages/ReportExplainer";
import TrendsTracker from "./pages/TrendsTracker";
import CompareReports from "./pages/CompareReports";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route element={<PrivateRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<DashboardOverview />} />
              <Route path="/upload" element={<ReportUpload />} />
              <Route path="/reports/:id" element={<ReportExplainer />} />
              <Route path="/trends" element={<TrendsTracker />} />
              <Route path="/compare" element={<CompareReports />} />
            </Route>
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
