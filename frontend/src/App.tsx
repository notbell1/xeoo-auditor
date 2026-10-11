import { Router, Routes, Route } from "./app/router";
import { LandingPage } from "./pages/public/LandingPage";
import { ContactPage } from "./pages/public/ContactPage";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminDashboardRoute } from "./pages/admin/AdminDashboardRoute";
import { NotFoundPage } from "./pages/NotFoundPage";

export function App() {
  return (
    <Router>
      <Routes>
        {/* Public Landing & Contact Pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* Secret Admin Authentication Gateway */}
        <Route path="/login/mimin" element={<AdminLoginPage />} />

        {/* Protected Admin Routes (Render 404 if no active authenticated session) */}
        <Route path="/mimin" element={<AdminDashboardRoute />} />
        <Route path="/mimin/dashboard" element={<AdminDashboardRoute />} />
        <Route path="/mimin/contact" element={<AdminDashboardRoute />} />
        <Route path="/mimin/statistik-audit" element={<AdminDashboardRoute />} />
        <Route path="/mimin/aktivitas-layanan" element={<AdminDashboardRoute />} />
        <Route path="/mimin/health" element={<AdminDashboardRoute />} />
        <Route path="/mimin/errors" element={<AdminDashboardRoute />} />
        <Route path="/mimin/keamanan" element={<AdminDashboardRoute />} />
        <Route path="/mimin/pengaturan" element={<AdminDashboardRoute />} />

        {/* Anti-bot / Catch-all Fallback: Routes all unauthorized probes to NotFound */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;
