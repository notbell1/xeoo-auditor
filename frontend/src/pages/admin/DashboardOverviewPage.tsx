import React, { useState, useEffect } from "react";
import {
  FileCheck2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Database,
  Server,
  Cpu,
  FolderLock,
  Mail,
  Tag,
} from "lucide-react";
import { Link } from "../../app/router";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { LoadingState } from "../../components/common/LoadingState";
import { ErrorState } from "../../components/common/EmptyState";
import { StatCard } from "../../components/admin/StatCard";
import { AuditVolumeChart } from "../../components/admin/AuditVolumeChart";
import {
  fetchDashboardOverview,
  type DashboardOverviewData,
} from "../../services/adminApi";

export const DashboardOverviewPage: React.FC = () => {
  const [data, setData] = useState<DashboardOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchDashboardOverview();
      setData(res);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load dashboard summary data",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await loadData();
    };
    fetchData();

    // Realtime synchronization: Poll every 15 seconds while tab is active
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchDashboardOverview()
          .then((res) => setData(res))
          .catch(() => {});
      }
    }, 15000);

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        fetchDashboardOverview()
          .then((res) => setData(res))
          .catch(() => {});
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, []);

  if (isLoading) {
    return (
      <LoadingState
        message="Loading operational dashboard summary..."
        className="min-h-[400px]"
      />
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to Load Dashboard"
        description={
          error || "An error occurred while fetching metrics from server."
        }
        onRetry={loadData}
      />
    );
  }

  const { summary, chart_data, health_summary, recent_errors, inquiries_summary, recent_inquiries } = data;

  return (
    <div className="space-y-6">
      {/* A. Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Audits (7 Days)"
          value={summary.total_audits}
          subtext="Completed & failed volume"
          icon={FileCheck2}
        />
        <StatCard
          label="Successful Audits"
          value={summary.completed_audits}
          subtext={`${summary.total_audits > 0 ? Math.round((summary.completed_audits / summary.total_audits) * 100) : 100}% success rate`}
          icon={FileCheck2}
          variant="pass"
        />
        <StatCard
          label="Failed Audits"
          value={summary.failed_audits}
          subtext="Target connection errors"
          icon={AlertTriangle}
          variant={summary.failed_audits > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Avg Duration"
          value={`${summary.avg_duration_ms} ms`}
          subtext="Processing inspection time"
          icon={Clock}
        />
        <StatCard
          label="Contact Inquiries"
          value={inquiries_summary?.total ?? 0}
          subtext={`${inquiries_summary?.unread ?? 0} unread submissions`}
          icon={Mail}
          variant={(inquiries_summary?.unread ?? 0) > 0 ? "warning" : "default"}
        />
      </div>

      {/* B. Chart & Health Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Audit Volume Chart Card */}
        <Card className="lg:col-span-8 p-4">
          <AuditVolumeChart
            data={chart_data}
            title="Daily Audit Volume (Last 7 Days)"
            height={220}
          />
        </Card>

        {/* D. Service Health Summary Card */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-3 border-b border-[var(--color-border-subtle)]">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Service Health
              </CardTitle>
              <Badge
                status={
                  summary.service_health === "OPERATIONAL" ? "pass" : "warning"
                }
              >
                {summary.service_health}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                <Server className="size-3.5 text-[var(--color-text-muted)]" />
                Backend API
              </span>
              <Badge status="pass" size="sm">
                OPERATIONAL
              </Badge>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                <Database className="size-3.5 text-[var(--color-text-muted)]" />
                Database MySQL
              </span>
              <Badge
                status={
                  health_summary.database === "OPERATIONAL" ? "pass" : "fail"
                }
                size="sm"
              >
                {health_summary.database}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                <Cpu className="size-3.5 text-[var(--color-text-muted)]" />
                Audit Engine (cURL)
              </span>
              <Badge status="pass" size="sm">
                OPERATIONAL
              </Badge>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                <FolderLock className="size-3.5 text-[var(--color-text-muted)]" />
                Temp Storage
              </span>
              <Badge status="pass" size="sm">
                OPERATIONAL
              </Badge>
            </div>

            <div className="pt-2 border-t border-[var(--color-border-subtle)]">
              <Link
                to="/mimin/health"
                className="text-xs font-semibold text-[var(--color-brand-primary)] hover:underline inline-flex items-center gap-1"
              >
                <span>View full diagnostics</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* E. Recent Sanitized Operational Errors Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-semibold">
              Recent Operational Incidents & Errors
            </CardTitle>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Sanitized application errors without exposing internal paths or credentials.
            </p>
          </div>
          <Link
            to="/mimin/errors"
            className="text-xs font-semibold text-[var(--color-brand-primary)] hover:underline inline-flex items-center gap-1"
          >
            <span>All errors</span>
            <ArrowRight className="size-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {recent_errors.length === 0 ? (
            <div className="py-6 text-center text-xs text-[var(--color-text-muted)] ">
              No operational errors or incidents recorded.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recent_errors.map((err) => (
                <div
                  key={err.fingerprint}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-[var(--radius-sm)] bg-[var(--color-surface-secondary)] border border-[var(--color-border-subtle)]"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--color-text-primary)]">
                        {err.fingerprint}
                      </span>
                      <Badge
                        status={
                          err.severity === "critical"
                            ? "fail"
                            : err.severity === "warning"
                              ? "warning"
                              : "not_checked"
                        }
                        size="sm"
                      >
                        {err.severity.toUpperCase()}
                      </Badge>
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        ({err.occurrence_count}x occurrences)
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] line-clamp-1">
                      {err.message}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-[11px] text-[var(--color-text-muted)]">
                    <span>
                      {new Date(err.last_seen_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* F. Recent Contact Submissions Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-semibold">
              Recent User Inquiries
            </CardTitle>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Messages and bug reports submitted through the public contact form.
            </p>
          </div>
          <Link
            to="/mimin/contact"
            className="text-xs font-semibold text-[var(--color-brand-primary)] hover:underline inline-flex items-center gap-1"
          >
            <span>All inquiries</span>
            <ArrowRight className="size-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {!recent_inquiries || recent_inquiries.length === 0 ? (
            <div className="py-6 text-center text-xs text-[var(--color-text-muted)]">
              No contact inquiries recorded yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recent_inquiries.map((inq) => (
                <div
                  key={inq.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-[var(--radius-sm)] bg-[var(--color-surface-secondary)] border border-[var(--color-border-subtle)]"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--color-text-primary)]">
                        {inq.name}
                      </span>
                      <span className="text-[11px] text-[var(--color-text-muted)] font-mono">
                        ({inq.email})
                      </span>
                      <Badge
                        status={
                          inq.status === "unread"
                            ? "warning"
                            : inq.status === "resolved"
                              ? "pass"
                              : "neutral"
                        }
                        size="sm"
                      >
                        {inq.status.toUpperCase()}
                      </Badge>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]">
                        <Tag className="size-2.5 text-[var(--color-text-muted)]" />
                        {inq.category}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] line-clamp-1">
                      {inq.subject}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-[11px] text-[var(--color-text-muted)]">
                    <span>
                      {new Date(inq.created_at).toLocaleString("en-US", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                    <Link
                      to="/mimin/contact"
                      className="text-xs text-[var(--color-brand-primary)] hover:underline font-medium"
                    >
                      Detail
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
