import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  X,
  BookOpen,
} from "lucide-react";
import Swal from "sweetalert2";
import { Button } from "../../components/common/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { Pagination } from "../../components/common/Pagination";
import { LoadingState } from "../../components/common/LoadingState";
import { ErrorState, EmptyState } from "../../components/common/EmptyState";
import { StatCard } from "../../components/admin/StatCard";
import {
  fetchOperationalErrors,
  updateErrorStatus,
  type OperationalErrorsResponse,
  type OperationalErrorItem,
} from "../../services/adminApi";
import { ApiRequestError } from "../../services/apiError";
import { showFailureAlert } from "../../lib/securityAlert";

export const ErrorMonitoringPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [data, setData] = useState<OperationalErrorsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected error for Runbook inspection modal
  const [selectedError, setSelectedError] =
    useState<OperationalErrorItem | null>(null);

  const loadData = React.useCallback(
    async (
      page = currentPage,
      status = statusFilter,
      severity = severityFilter,
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchOperationalErrors(
          page,
          10,
          status || undefined,
          severity || undefined,
        );
        setData(res);
        setCurrentPage(page);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load error monitoring logs",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [currentPage, statusFilter, severityFilter],
  );

  useEffect(() => {
    const fetchData = async () => {
      await loadData(currentPage, statusFilter, severityFilter);
    };
    fetchData();
  }, [loadData, currentPage, statusFilter, severityFilter]);

  const handleToggleStatus = async (item: OperationalErrorItem) => {
    const newStatus = item.status === "unresolved" ? "resolved" : "unresolved";
    try {
      await updateErrorStatus(item.fingerprint, newStatus);
      Swal.fire({
        icon: "success",
        title: "Status Updated",
        text: `Error ${item.fingerprint} marked as ${newStatus}.`,
        timer: 1500,
        showConfirmButton: false,
      });
      loadData(currentPage, statusFilter, severityFilter);
      if (selectedError?.fingerprint === item.fingerprint) {
        setSelectedError({ ...selectedError, status: newStatus });
      }
    } catch (err: unknown) {
      showFailureAlert(err instanceof ApiRequestError ? err.failure : undefined);
    }
  };

  if (isLoading && !data) {
    return (
      <LoadingState
        message="Loading sanitized operational error groups..."
        className="min-h-[400px]"
      />
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to Load Error Monitoring"
        description={error || "Server connection error occurred."}
        onRetry={() => loadData(currentPage, statusFilter, severityFilter)}
      />
    );
  }

  const { errors, pagination, stats } = data;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Error Groups"
          value={stats.total}
          subtext="Registered fingerprint groups"
          icon={AlertTriangle}
        />
        <StatCard
          label="Unresolved"
          value={stats.unresolved}
          subtext="Requires runbook review"
          icon={AlertCircle}
          variant={stats.unresolved > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Resolved"
          value={stats.resolved}
          subtext="Incidents marked resolved"
          icon={CheckCircle2}
          variant="pass"
        />
      </div>

      {/* Filter Bar & Table Card */}
      <Card>
        <CardHeader className="border-b border-[var(--color-border-subtle)] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">
              Sanitized Operational Error Groups
            </CardTitle>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Error messages sanitized without containing credentials, SQL query strings, or system paths.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[var(--color-text-secondary)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
            >
              <option value="">All Statuses</option>
              <option value="unresolved">Unresolved</option>
              <option value="resolved">Resolved</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[var(--color-text-secondary)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {errors.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No Errors Found"
                description="No error groups match the current filter criteria."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]  text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Fingerprint</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Sanitized Error Message</th>
                    <th className="py-3 px-4">Frequency</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                  {errors.map((item) => (
                    <tr
                      key={item.fingerprint}
                      className="hover:bg-[var(--color-surface-hover)] transition-colors duration-150"
                    >
                      <td className="py-3 px-4  font-bold text-[var(--color-text-primary)] whitespace-nowrap">
                        {item.fingerprint}
                      </td>
                      <td className="py-3 px-4  text-[var(--color-text-secondary)] whitespace-nowrap">
                        {item.category}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge
                          status={
                            item.severity === "critical"
                              ? "fail"
                              : item.severity === "warning"
                                ? "warning"
                                : "not_checked"
                          }
                          size="sm"
                        >
                          {item.severity.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-[var(--color-text-secondary)] max-w-sm truncate">
                        {item.message}
                      </td>
                      <td className="py-3 px-4  text-[var(--color-text-primary)] whitespace-nowrap">
                        {item.occurrence_count}x
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge
                          status={
                            item.status === "resolved" ? "pass" : "warning"
                          }
                          size="sm"
                        >
                          {item.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedError(item)}
                        >
                          Runbook
                        </Button>
                        <Button
                          variant={
                            item.status === "unresolved"
                              ? "primary"
                              : "secondary"
                          }
                          size="sm"
                          onClick={() => handleToggleStatus(item)}
                        >
                          {item.status === "unresolved"
                            ? "Mark Resolved"
                            : "Reopen"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Shared Pagination Component */}
          {pagination.total_pages > 1 && (
            <div className="p-4 border-t border-[var(--color-border-subtle)]">
              <Pagination
                currentPage={pagination.current_page}
                totalPages={pagination.total_pages}
                totalItems={pagination.total_items}
                itemsPerPage={pagination.per_page}
                onPageChange={(p) => setCurrentPage(p)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Runbook / Detail Modal */}
      {selectedError && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-strong)] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-subtle)]">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-[var(--color-brand-primary)]" />
                <h3 className="text-sm font-bold  text-[var(--color-text-primary)]">
                  {selectedError.fingerprint}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedError(null)}
                className="p-1 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-[var(--color-text-muted)]">
                  Incident Message:
                </span>
                <p className="mt-1 p-2.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] ">
                  {selectedError.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] ">
                <div>
                  <span className="text-[var(--color-text-muted)]">
                    First Seen:
                  </span>{" "}
                  <span className="text-[var(--color-text-secondary)]">
                    {new Date(selectedError.first_seen_at).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)]">
                    Last Seen:
                  </span>{" "}
                  <span className="text-[var(--color-text-secondary)]">
                    {new Date(selectedError.last_seen_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-semibold text-[var(--color-text-muted)]">
                  Remediation Guide / Runbook:
                </span>
                <div className="mt-1 p-3 rounded-[var(--radius-sm)] bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] whitespace-pre-line leading-relaxed">
                  {selectedError.runbook ||
                    "No specific runbook defined for this error."}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border-subtle)]">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedError(null)}
              >
                Close
              </Button>
              <Button
                variant={
                  selectedError.status === "unresolved"
                    ? "primary"
                    : "secondary"
                }
                size="sm"
                onClick={() => handleToggleStatus(selectedError)}
              >
                {selectedError.status === "unresolved"
                  ? "Mark Resolved"
                  : "Reopen"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
