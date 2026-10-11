import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  PlusCircle,
  History,
  Settings,
  ChartNoAxesCombined,
  Activity,
  Gauge,
  AlertTriangle,
  LockKeyhole,
  Settings2,
  Mail,
} from "lucide-react";

export interface PublicNavLink {
  id: string;
  label: string;
  href: string;
}

export const PUBLIC_NAV_LINKS: PublicNavLink[] = [
  { id: "home", label: "Home", href: "/" },
  { id: "features", label: "Features", href: "/#features" },
  { id: "how-it-works", label: "How It Works", href: "/#how-it-works" },
  { id: "audit-preview", label: "Sample Report", href: "/#audit-preview" },
  { id: "faq", label: "FAQ", href: "/#faq" },
  { id: "contact", label: "Contact", href: "/contact" },
];

export interface AppNavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Overview & system health",
  },
  {
    path: "/audit",
    label: "New Audit",
    icon: PlusCircle,
    description: "Launch website audit",
  },
  {
    path: "/audits",
    label: "Audit History",
    icon: History,
    description: "Past inspection reports",
  },
  {
    path: "/settings",
    label: "Settings",
    icon: Settings,
    description: "Engine limits & security",
  },
];

export type NavViewId = "home" | "dashboard" | "new-audit" | "history" | "settings";

export interface NavItemConfig {
  id: NavViewId;
  label: string;
  path: string;
  badge?: string;
  icon: LucideIcon;
  description?: string;
}

export const NAV_ITEMS: NavItemConfig[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "#dashboard",
    icon: LayoutDashboard,
    description: "Overview & system health",
  },
  {
    id: "new-audit",
    label: "New Audit",
    path: "#new-audit",
    icon: PlusCircle,
    description: "Launch website audit",
  },
  {
    id: "history",
    label: "Audit History",
    path: "#history",
    icon: History,
    description: "Past inspection reports",
  },
  {
    id: "settings",
    label: "Settings",
    path: "#settings",
    icon: Settings,
    description: "Engine limits & security",
  },
];

export interface AdminNavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
  description: string;
}

export interface AdminNavSection {
  title: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    title: "Overview",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        path: "/mimin/dashboard",
        icon: LayoutDashboard,
        description: "Operational summary & system metrics",
      },
      {
        id: "contact",
        label: "Contact",
        path: "/mimin/contact",
        icon: Mail,
        description: "User inquiries & contact submissions",
      },
    ],
  },
  {
    title: "Audit Operations",
    items: [
      {
        id: "statistik-audit",
        label: "Audit Statistics",
        path: "/mimin/statistik-audit",
        icon: ChartNoAxesCombined,
        description: "Aggregate volume & audit module execution",
      },
      {
        id: "aktivitas-layanan",
        label: "Service Activity",
        path: "/mimin/aktivitas-layanan",
        icon: Activity,
        description: "System activity logs & API requests",
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        id: "health",
        label: "Health & Monitoring",
        path: "/mimin/health",
        icon: Gauge,
        description: "Component health & backend connectivity",
      },
      {
        id: "errors",
        label: "Error Monitoring",
        path: "/mimin/errors",
        icon: AlertTriangle,
        description: "Incident tracking & application errors",
      },
      {
        id: "keamanan",
        label: "System Security",
        path: "/mimin/keamanan",
        icon: LockKeyhole,
        description: "Security posture, sessions, and SSRF defense",
      },
      {
        id: "pengaturan",
        label: "Settings",
        path: "/mimin/pengaturan",
        icon: Settings2,
        description: "Execution limits & data retention configuration",
      },
    ],
  },
];

