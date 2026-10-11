import React, { useState, useEffect } from "react";
import { LockKeyhole, UserCheck, Ban, Clock, KeyRound } from "lucide-react";

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
import {
  fetchSecurityPosture,
  type SecurityPostureData,
} from "../../services/adminApi";

export const SystemSecurityPage: React.FC = () => {
  const [data, setData] = useState<SecurityPostureData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchSecurityPosture();
      setData(res);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load system security posture",
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
  }, []);

  if (isLoading && !data) {
    return (
      <LoadingState
        message="Evaluating security posture and session parameters..."
        className="min-h-[400px]"
      />
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to Check Security"
        description={
          error || "An error occurred while verifying system security."
        }
        onRetry={loadData}
      />
    );
  }

  const { session_posture, failed_login_stats, checks, recent_security_logs } =
    data;
  const security_events = data.security_events ?? { by_category_24h: [], recent: [] };

  return (
    <div className="space-y-6">
      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Active Admin Sessions"
          value={session_posture.active_admin_sessions}
          subtext="Policy: 1 Active Session per Admin"
          icon={UserCheck}
          variant="pass"
        />
        <StatCard
          label="Failed Logins (24 Hours)"
          value={failed_login_stats.last_24h}
          subtext="Rejected authentication attempts"
          icon={Ban}
          variant={failed_login_stats.last_24h > 5 ? "warning" : "default"}
        />
        <StatCard
          label="Failed Logins (7 Days)"
          value={failed_login_stats.last_7d}
          subtext="Aggregate failed login attempts"
          icon={Clock}
        />
      </div>

      {/* Security Enforcements Matrix */}
      <Card>
        <CardHeader className="border-b border-[var(--color-border-subtle)] pb-3">
          <CardTitle className="text-sm font-semibold">
            Non-Negotiable Security Enforcement Matrix
          </CardTitle>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            System defense parameters enforced by architecture that cannot be disabled for operational safety.
          </p>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {checks.map((chk) => (
            <div
              key={chk.id}
              className="flex items-start justify-between gap-4 p-3.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-secondary)]"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <LockKeyhole className="size-4 text-[var(--color-brand-primary)] shrink-0" />
                  <span className="text-xs font-bold text-[var(--color-text-primary)]">
                    {chk.title}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] pl-6">
                  {chk.details}
                </p>
              </div>

              <Badge status={chk.status === "PASS" ? "pass" : "fail"} size="sm">
                {chk.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Blocked & throttled requests (sanitized: no IPs, URLs, or payloads) */}
      <Card>
        <CardHeader className="border-b border-[var(--color-border-subtle)] pb-3">
          <CardTitle className="text-sm font-semibold">
            Blocked &amp; Throttled Requests
          </CardTitle>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Rejected or rate-limited requests (last 24 hours summary, latest 10 events). Events never include IP addresses, target URLs, or request payloads, and are retained for 14 days.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {security_events.recent.length === 0 ? (
            <p className="p-4 text-xs text-[var(--color-text-muted)]">
              No blocked or throttled requests have been recorded.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-x-6 gap-y-1 p-4 text-xs text-[var(--color-text-secondary)] border-b border-[var(--color-border-subtle)]">
                {security_events.by_category_24h.map((row) => (
                  <span key={row.category}>
                    <span className="font-semibold text-[var(--color-text-primary)]">{row.total}</span>{" "}
                    {row.category}
                  </span>
                ))}
              </div>
              <div className="divide-y border-[var(--color-border-subtle)] text-xs">
                {security_events.recent.map((ev) => (
                  <div
                    key={`${ev.request_id}-${ev.created_at}-${ev.reason_code}`}
                    className="p-3.5 flex items-center justify-between gap-4 hover:bg-[var(--color-surface-hover)]"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {ev.category}
                      </span>
                      <p className="text-[11px] text-[var(--color-text-secondary)] truncate">
                        {ev.route} &middot; {ev.reason_code} &middot; {ev.action_taken} &middot; ref {ev.request_id}
                      </p>
                    </div>
                    <span className="text-[11px] text-[var(--color-text-muted)] shrink-0">
                      {new Date(ev.created_at.replace(" ", "T") + "Z").toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Security Events Log */}
      <Card>
        <CardHeader className="border-b border-[var(--color-border-subtle)] pb-3">
          <CardTitle className="text-sm font-semibold">
            Sanitized Security Event Logs
          </CardTitle>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Audit trail of authentication events and administrator credential mutations.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y border-[var(--color-border-subtle)] text-xs">
            {recent_security_logs.map((log, idx) => (
              <div
                key={idx}
                className="p-3.5 flex items-center justify-between gap-4 hover:bg-[var(--color-surface-hover)]"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <KeyRound className="size-3.5 text-[var(--color-text-muted)]" />
                    <span className=" font-semibold text-[var(--color-text-primary)]">
                      {log.action}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-secondary)] pl-5 truncate max-w-lg">
                    {log.details || "Operational action completed successfully"}
                  </p>
                </div>
                <span className=" text-[11px] text-[var(--color-text-muted)] shrink-0">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
