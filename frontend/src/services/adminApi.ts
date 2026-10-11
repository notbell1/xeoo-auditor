/**
 * Admin API Service Client for XeooAuditor
 * Handles authenticated API calls to backend endpoints under /api/admin/
 */

import { assertOk } from "./apiError";

const API_BASE = "/api/admin";

export interface DashboardOverviewData {
  admin: {
    username: string;
    role: string;
  };
  summary: {
    total_audits: number;
    completed_audits: number;
    failed_audits: number;
    avg_duration_ms: number;
    service_health: "OPERATIONAL" | "DEGRADED" | "UNAVAILABLE";
    active_admin_sessions: number;
    failed_logins_24h: number;
  };
  inquiries_summary?: {
    total: number;
    unread: number;
  };
  recent_inquiries?: Array<{
    id: number;
    name: string;
    email: string;
    category: string;
    subject: string;
    status: "unread" | "read" | "resolved" | "archived";
    created_at: string;
  }>;
  chart_data: Array<{
    date: string;
    total: number;
    completed: number;
    failed: number;
  }>;
  health_summary: {
    backend_api: string;
    database: string;
    audit_processor: string;
    temp_storage: string;
    last_checked: string;
  };
  recent_errors: Array<{
    fingerprint: string;
    category: string;
    severity: string;
    message: string;
    occurrence_count: number;
    status: string;
    last_seen_at: string;
  }>;
  server_time: string;
}

export interface AuditStatsData {
  range_days: number;
  summary: {
    total_audits: number;
    completed_audits: number;
    failed_audits: number;
    success_rate: number;
    avg_duration_ms: number;
    module_execution_counts: {
      ssl_tls: number;
      security_headers: number;
      sitemap: number;
      robots_txt: number;
    };
  };
  trend: Array<{
    date: string;
    total: number;
    completed: number;
    failed: number;
    avg_duration: number;
  }>;
  generated_at: string;
}

export interface ServiceActivityItem {
  id: number;
  category: string;
  severity: string;
  summary: string;
  timestamp: string;
  correlation_id: string;
}

export interface ServiceActivityResponse {
  pagination: {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
  };
  events_24h_count: number;
  events: ServiceActivityItem[];
}

export interface HealthComponent {
  id: string;
  name: string;
  status: "OPERATIONAL" | "DEGRADED" | "UNAVAILABLE";
  latency_ms?: number;
  details: string;
}

export interface HealthResponse {
  status: "OPERATIONAL" | "DEGRADED" | "UNAVAILABLE";
  checked_at: string;
  components: HealthComponent[];
}

export interface OperationalErrorItem {
  id: number;
  fingerprint: string;
  category: string;
  severity: "critical" | "warning" | "info";
  message: string;
  occurrence_count: number;
  status: "unresolved" | "resolved";
  first_seen_at: string;
  last_seen_at: string;
  runbook: string | null;
}

export interface OperationalErrorsResponse {
  pagination: {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
  };
  stats: {
    unresolved: number;
    resolved: number;
    total: number;
  };
  errors: OperationalErrorItem[];
}

export interface SecurityPostureData {
  session_posture: {
    active_admin_sessions: number;
    policy: string;
    idle_timeout_minutes: number;
  };
  failed_login_stats: {
    last_24h: number;
    last_7d: number;
  };
  checks: Array<{
    id: string;
    title: string;
    status: "PASS" | "FAIL" | "WARNING" | "NOT_CHECKED";
    details: string;
  }>;
  recent_security_logs: Array<{
    action: string;
    details: string;
    created_at: string;
  }>;
  security_events?: {
    by_category_24h: Array<{ category: string; total: number | string }>;
    recent: Array<{
      request_id: string;
      category: string;
      severity: string;
      route: string;
      reason_code: string;
      action_taken: string;
      created_at: string;
    }>;
  };
  evaluated_at: string;
}

export interface SystemSettingsData {
  admin: {
    id: number;
    username: string;
    role: string;
  };
  settings: Record<string, { value: string; description: string }>;
  app_info: {
    name: string;
    version: string;
    environment: string;
    php_version: string;
    database_engine: string;
    server_time: string;
  };
}

// 1. Fetch Dashboard Overview
export async function fetchDashboardOverview(): Promise<DashboardOverviewData> {
  const res = await fetch(`${API_BASE}/dashboard.php`, { credentials: "include" });
  await assertOk(res, "Failed to fetch dashboard overview data");
  return res.json();
}

// 2. Fetch Audit Statistics
export async function fetchAuditStats(rangeDays = 30): Promise<AuditStatsData> {
  const res = await fetch(`${API_BASE}/statistik-audit.php?range=${rangeDays}`, {
    credentials: "include",
  });
  await assertOk(res, "Failed to fetch audit statistics");
  return res.json();
}

// 3. Fetch Service Activities
export async function fetchServiceActivities(page = 1, limit = 10): Promise<ServiceActivityResponse> {
  const res = await fetch(`${API_BASE}/aktivitas-layanan.php?page=${page}&limit=${limit}`, {
    credentials: "include",
  });
  await assertOk(res, "Failed to fetch service activity data");
  return res.json();
}

// 4. Fetch System Health
export async function fetchSystemHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health.php`, { credentials: "include" });
  await assertOk(res, "Failed to check system health status");
  return res.json();
}

// 5. Fetch Operational Errors
export async function fetchOperationalErrors(
  page = 1,
  limit = 10,
  status?: string,
  severity?: string
): Promise<OperationalErrorsResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  if (severity) params.set("severity", severity);

  const res = await fetch(`${API_BASE}/errors.php?${params.toString()}`, {
    credentials: "include",
  });
  await assertOk(res, "Failed to fetch error monitoring data");
  return res.json();
}

// Update Operational Error Status
export async function updateErrorStatus(
  fingerprint: string,
  newStatus: "resolved" | "unresolved"
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/errors.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ fingerprint, status: newStatus }),
  });
  await assertOk(res, "Failed to update error status");
  return res.json();
}

// 6. Fetch Security Posture
export async function fetchSecurityPosture(): Promise<SecurityPostureData> {
  const res = await fetch(`${API_BASE}/keamanan.php`, { credentials: "include" });
  await assertOk(res, "Failed to verify system security posture");
  return res.json();
}

// 7. Fetch & Update System Settings
export async function fetchSystemSettings(): Promise<SystemSettingsData> {
  const res = await fetch(`${API_BASE}/settings.php`, { credentials: "include" });
  await assertOk(res, "Failed to load system settings");
  return res.json();
}

export async function updateSystemSettings(
  updates: Record<string, string | number>
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/settings.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(updates),
  });
  await assertOk(res, "Failed to save settings changes");
  return res.json();
}

// 8. Contact Submissions Management
export interface ContactSubmissionItem {
  id: number;
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  ip_address: string;
  status: "unread" | "read" | "resolved" | "archived";
  admin_notes: string | null;
  created_at: string;
}

export interface ContactSubmissionsResponse {
  success: boolean;
  items?: ContactSubmissionItem[];
  pagination?: {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
  };
  unread_count?: number;
  data?: {
    items: ContactSubmissionItem[];
    pagination: {
      current_page: number;
      per_page: number;
      total_items: number;
      total_pages: number;
    };
    unread_count: number;
  };
}

export async function fetchContactSubmissions(
  page = 1,
  perPage = 10,
  status?: string,
  search?: string
): Promise<ContactSubmissionsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  if (status && status !== "all") params.set("status", status);
  if (search && search.trim()) params.set("search", search.trim());

  const res = await fetch(`${API_BASE}/contact/list.php?${params.toString()}`, {
    credentials: "include",
  });
  await assertOk(res, "Failed to fetch contact submissions");
  return res.json();
}

export async function updateContactSubmissionStatus(
  id: number,
  status: "unread" | "read" | "resolved" | "archived",
  adminNotes?: string
): Promise<{ success: boolean; data: { message: string; id: number; status: string } }> {
  const res = await fetch(`${API_BASE}/contact/update_status.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      id,
      status,
      admin_notes: adminNotes,
    }),
  });
  await assertOk(res, "Failed to update submission status");
  return res.json();
}

