import React, { useState, useEffect } from "react";
import { Activity, Clock, Hash } from "lucide-react";

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
  fetchServiceActivities,
  type ServiceActivityResponse,
} from "../../services/adminApi";

export const ServiceActivityPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState<ServiceActivityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = React.useCallback(
    async (page = currentPage) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchServiceActivities(page, 10);
        setData(res);
        setCurrentPage(page);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load service activity logs",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [currentPage],
  );

  useEffect(() => {
    const fetchData = async () => {
      await loadData(currentPage);
    };
    fetchData();
  }, [currentPage, loadData]);

  if (isLoading && !data) {
    return (
      <LoadingState
        message="Loading system activity log records..."
        className="min-h-[400px]"
      />
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to Load Activity"
        description={
          error || "An error occurred while loading service activity."
        }
        onRetry={() => loadData(currentPage)}
      />
    );
  }

  const { events, pagination, events_24h_count } = data;

  return (
    <div className="space-y-6">
      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Recorded Events"
          value={pagination.total_items}
          subtext="All operational activity logs"
          icon={Hash}
        />
        <StatCard
          label="Last 24 Hours Activity"
          value={events_24h_count}
          subtext="Recent authentication & system operations"
          icon={Clock}
          variant="pass"
        />
        <StatCard
          label="Log Engine Status"
          value="Active (PDO)"
          subtext="Audit log stored asynchronously"
          icon={Activity}
        />
      </div>

      {/* Activity Events Table Card */}
      <Card>
        <CardHeader className="border-b border-[var(--color-border-subtle)] pb-3">
          <CardTitle className="text-sm font-semibold">
            Operational Activity Records
          </CardTitle>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Chronological log of authenticated actions and system events.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No Activity Yet"
                description="No operational activities recorded in the database yet."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]  text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Event Category</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Operation Summary</th>
                    <th className="py-3 px-4 text-right">Correlation ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                  {events.map((evt) => (
                    <tr
                      key={evt.id}
                      className="hover:bg-[var(--color-surface-hover)] transition-colors duration-150"
                    >
                      <td className="py-3 px-4  text-[var(--color-text-secondary)] whitespace-nowrap">
                        {new Date(evt.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4  font-semibold text-[var(--color-text-primary)] whitespace-nowrap">
                        {evt.category}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge
                          status={
                            evt.severity === "warning"
                              ? "warning"
                              : evt.severity === "critical"
                                ? "fail"
                                : "pass"
                          }
                          size="sm"
                        >
                          {evt.severity.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-[var(--color-text-secondary)] max-w-md truncate">
                        {evt.summary}
                      </td>
                      <td className="py-3 px-4 text-right  text-[var(--color-text-muted)] whitespace-nowrap">
                        #{evt.correlation_id}
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
    </div>
  );
};
