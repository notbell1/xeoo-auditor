import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useLocation } from "../../app/router-context";
import { verifyAdminSession } from "../../services/adminAuth";
import { AdminLayout } from "../../layouts/AdminLayout";
import { NotFoundPage } from "../NotFoundPage";
import { DashboardOverviewPage } from "./DashboardOverviewPage";
import { AuditStatsPage } from "./AuditStatsPage";
import { ServiceActivityPage } from "./ServiceActivityPage";
import { HealthMonitoringPage } from "./HealthMonitoringPage";
import { ErrorMonitoringPage } from "./ErrorMonitoringPage";
import { SystemSecurityPage } from "./SystemSecurityPage";
import { AdminSettingsPage } from "./AdminSettingsPage";
import { AdminContactPage } from "./AdminContactPage";

export const AdminDashboardRoute: React.FC = () => {
  const { pathname } = useLocation();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;
    verifyAdminSession().then((res) => {
      if (isMounted) {
        setIsAuthenticated(res.authenticated);
        setIsVerifying(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <Loader2 className="size-8 text-[var(--color-brand-primary)] animate-spin" />
      </div>
    );
  }

  // Anti-bot & Stealth security requirement:
  // If not authenticated, render the existing NotFoundPage directly.
  // DO NOT redirect to /login/mimin, keeping the hidden login route secret from scanners.
  if (!isAuthenticated) {
    return <NotFoundPage />;
  }

  const renderActiveAdminPage = () => {
    switch (pathname) {
      case "/mimin":
      case "/mimin/dashboard":
        return <DashboardOverviewPage />;
      case "/mimin/statistik-audit":
        return <AuditStatsPage />;
      case "/mimin/aktivitas-layanan":
        return <ServiceActivityPage />;
      case "/mimin/health":
        return <HealthMonitoringPage />;
      case "/mimin/errors":
        return <ErrorMonitoringPage />;
      case "/mimin/keamanan":
        return <SystemSecurityPage />;
      case "/mimin/pengaturan":
        return <AdminSettingsPage />;
      case "/mimin/contact":
        return <AdminContactPage />;
      default:
        return <NotFoundPage />;
    }
  };

  return <AdminLayout>{renderActiveAdminPage()}</AdminLayout>;
};
