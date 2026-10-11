import React, { useState, useEffect } from "react";
import {
  Gauge,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Server,
  Cpu,
  FolderLock,
  LockKeyhole,
} from "lucide-react";

import { Card, CardContent } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { LoadingState } from "../../components/common/LoadingState";
import { ErrorState } from "../../components/common/EmptyState";
import {
  fetchSystemHealth,
  type HealthResponse,
} from "../../services/adminApi";

export const HealthMonitoringPage: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchSystemHealth();
      setHealth(res);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load system health status",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await loadHealth();
    };
    fetchData();
  }, []);

  if (isLoading && !health) {
    return (
      <LoadingState
        message="Running system component health diagnostics..."
        className="min-h-[400px]"
      />
    );
  }

  if (error || !health) {
    return (
      <ErrorState
        title="Diagnostics Failed"
        description={
          error || "Unable to reach the internal diagnostics API."
        }
        onRetry={loadHealth}
      />
    );
  }

  const getComponentIcon = (id: string) => {
    switch (id) {
      case "database":
        return Database;
      case "backend_api":
        return Server;
      case "temp_storage":
        return FolderLock;
      case "audit_processor":
        return Cpu;
      case "ssrf_guard":
        return LockKeyhole;
      default:
        return Gauge;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Health Status Banner */}
      <Card
        className={`border-l-4 ${
          health.status === "OPERATIONAL"
            ? "border-l-[var(--color-status-pass)] bg-[var(--color-surface)]"
            : health.status === "DEGRADED"
              ? "border-l-[var(--color-status-warning)] bg-[var(--color-status-warning-bg)]"
              : "border-l-[var(--color-status-fail)] bg-[var(--color-status-fail-bg)]"
        }`}
      >
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {health.status === "OPERATIONAL" ? (
              <CheckCircle2 className="size-6 text-[var(--color-status-pass)] shrink-0" />
            ) : health.status === "DEGRADED" ? (
              <AlertTriangle className="size-6 text-[var(--color-status-warning)] shrink-0" />
            ) : (
              <XCircle className="size-6 text-[var(--color-status-fail)] shrink-0" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                  System Status: {health.status}
                </h2>
                <Badge
                  status={
                    health.status === "OPERATIONAL"
                      ? "pass"
                      : health.status === "DEGRADED"
                        ? "warning"
                        : "fail"
                  }
                >
                  {health.status}
                </Badge>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5 ">
                Last verified:{" "}
                {new Date(health.checked_at).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="text-xs  text-[var(--color-text-secondary)] bg-[var(--color-surface-secondary)] px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] self-start sm:self-auto">
            {health.components.filter((c) => c.status === "OPERATIONAL").length}{" "}
            / {health.components.length} Components Healthy
          </div>
        </CardContent>
      </Card>

      {/* Individual Component Diagnostic Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]  px-1">
          Detailed Subsystem Diagnostics
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {health.components.map((comp) => {
            const Icon = getComponentIcon(comp.id);
            return (
              <Card key={comp.id} className="p-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]">
                        <Icon className="size-4" />
                      </div>
                      <span className="text-xs font-bold text-[var(--color-text-primary)] ">
                        {comp.name}
                      </span>
                    </div>
                    <Badge
                      status={
                        comp.status === "OPERATIONAL"
                          ? "pass"
                          : comp.status === "DEGRADED"
                            ? "warning"
                            : "fail"
                      }
                      size="sm"
                    >
                      {comp.status}
                    </Badge>
                  </div>

                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    {comp.details}
                  </p>
                </div>

                {comp.latency_ms !== undefined && (
                  <div className="mt-3 pt-2 border-t border-[var(--color-border-subtle)] flex items-center justify-between text-[11px]  text-[var(--color-text-muted)]">
                    <span>Socket Response Time</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {comp.latency_ms} ms
                    </span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
