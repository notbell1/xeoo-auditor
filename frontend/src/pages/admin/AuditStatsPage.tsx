import React, { useState, useEffect } from "react";
import {
  ChartNoAxesCombined,
  CheckCircle2,
  XCircle,
  Clock,
  FileCode,
  Lock,
  Globe,
  FileSearch,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/common/Card";
import { LoadingState } from "../../components/common/LoadingState";
import { ErrorState } from "../../components/common/EmptyState";
import { StatCard } from "../../components/admin/StatCard";
import { AuditVolumeChart } from "../../components/admin/AuditVolumeChart";
import { fetchAuditStats, type AuditStatsData } from "../../services/adminApi";

export const AuditStatsPage: React.FC = () => {
  const [rangeDays, setRangeDays] = useState<number>(30);
  const [data, setData] = useState<AuditStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = React.useCallback(
    async (days = rangeDays) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchAuditStats(days);
        setData(res);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load audit statistics",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [rangeDays],
  );

  useEffect(() => {
    const fetchData = async () => {
      await loadData(rangeDays);
    };
    fetchData();
  }, [rangeDays, loadData]);

  if (isLoading && !data) {
    return (
      <LoadingState
        message="Loading audit analytics statistics..."
        className="min-h-[400px]"
      />
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to Load Statistics"
        description={
          error || "An error occurred while loading audit analytics data."
        }
        onRetry={() => loadData(rangeDays)}
      />
    );
  }

  const { summary, trend } = data;

  return (
    <div className="space-y-4">
      {/* Compact Period Filter Bar */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-[var(--color-border-subtle)]">
        <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
          Aggregate Analytics Range
        </span>
        <div className="flex items-center p-0.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setRangeDays(days)}
              className={`px-2 py-0.5 text-xs font-medium rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
                rangeDays === days
                  ? "bg-[var(--color-surface)] text-[var(--color-brand-primary)] shadow-xs font-bold"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={`Total Audits (${rangeDays} Days)`}
          value={summary.total_audits}
          subtext="Total inspection requests"
          icon={ChartNoAxesCombined}
        />
        <StatCard
          label="Success Rate"
          value={`${summary.success_rate}%`}
          subtext={`${summary.completed_audits} of ${summary.total_audits} inspections completed`}
          icon={CheckCircle2}
          variant="pass"
        />
        <StatCard
          label="Connection Failures"
          value={summary.failed_audits}
          subtext="Target unreachable or timed out"
          icon={XCircle}
          variant={summary.failed_audits > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Average Duration"
          value={`${summary.avg_duration_ms} ms`}
          subtext="Socket processing latency"
          icon={Clock}
        />
      </div>

      {/* Audit Volume Chart */}
      <Card className="p-4">
        <AuditVolumeChart
          data={trend}
          title={`Inspection Volume Trend (Last ${rangeDays} Days)`}
          height={240}
        />
      </Card>

      {/* Module Execution Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Audit Module Execution Distribution
          </CardTitle>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Frequency of technical inspection component executions over{" "}
            {rangeDays} days.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  SSL & TLS Handshake
                </span>
                <Lock className="size-4 text-[var(--color-brand-primary)]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[var(--color-text-primary)]">
                {summary.module_execution_counts.ssl_tls}
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Certificate validation & TLS 1.3 ciphers
              </p>
            </div>

            <div className="p-4 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  Security Headers
                </span>
                <FileCode className="size-4 text-[var(--color-brand-primary)]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[var(--color-text-primary)]">
                {summary.module_execution_counts.security_headers}
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Evaluation of HSTS, CSP, XFO, & CORS
              </p>
            </div>

            <div className="p-4 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  Sitemap Index XML
                </span>
                <Globe className="size-4 text-[var(--color-brand-primary)]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[var(--color-text-primary)]">
                {summary.module_execution_counts.sitemap}
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Public sitemap structure validation
              </p>
            </div>

            <div className="p-4 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  Robots.txt & Crawl
                </span>
                <FileSearch className="size-4 text-[var(--color-brand-primary)]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[var(--color-text-primary)]">
                {summary.module_execution_counts.robots_txt}
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                User-agent & crawl-delay directives
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
