export type AuditStatus =
  | "PASS"
  | "FAIL"
  | "WARNING"
  | "NOT_CHECKED"
  | "MANUAL_REQUIRED"
  | "CONNECT_REQUIRED";

export type AuditCategory =
  | "TECHNICAL_SEO"
  | "SECURITY_TLS"
  | "LINK_HEALTH"
  | "STRUCTURED_DATA"
  | "PERFORMANCE_CONFIG"
  | "FORMS_USABILITY"
  | "ANALYTICS_CONVERSION"
  | "CONFIG_BRANDING"
  | "RESPONSIVE_MOBILE"
  | string;

export interface AuditFinding {
  id: string;
  category: AuditCategory;
  title: string;
  status: AuditStatus;
  description: string;
  recommendation: string;
  evidence?: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
}

export interface AuditRecord {
  id: string;
  url: string;
  domain?: string;
  createdAt: string;
  durationMs: number;
  score: number; // 0 - 100
  summary: {
    pass: number;
    fail: number;
    warning: number;
    notChecked: number;
    manualRequired: number;
  };
  findings: AuditFinding[];
  isDemo?: boolean;
}
