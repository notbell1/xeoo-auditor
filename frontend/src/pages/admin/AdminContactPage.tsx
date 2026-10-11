import React, { useState, useEffect, useCallback } from "react";
import {
  Mail,
  Eye,
  CheckCircle2,
  Search,
  X,
  Tag,
  AlertCircle,
  Inbox,
  Archive,
  BookOpen,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  Badge,
  Button,
  Input,
  Pagination,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  LoadingState,
  EmptyState,
} from "../../components/common";
import { StatCard } from "../../components/admin/StatCard";
import {
  fetchContactSubmissions,
  updateContactSubmissionStatus,
  type ContactSubmissionItem,
} from "../../services/adminApi";
import { ApiRequestError } from "../../services/apiError";
import { showFailureAlert } from "../../lib/securityAlert";

export const AdminContactPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<ContactSubmissionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Search input state vs active filter applied to backend
  const [searchInputValue, setSearchInputValue] = useState<string>("");
  const [appliedSearch, setAppliedSearch] = useState<string>("");

  // Compact Detail Modal state
  const [activeItem, setActiveItem] = useState<ContactSubmissionItem | null>(
    null,
  );
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [adminNotes, setAdminNotes] = useState<string>("");

  // Manual refresh / programmatic reload
  const refreshData = useCallback(
    async (
      page = currentPage,
      status = statusFilter,
      search = appliedSearch,
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetchContactSubmissions(page, 10, status, search);
        if (res.success) {
          const items = res.items ?? res.data?.items ?? [];
          const pagination = res.pagination ?? res.data?.pagination;
          const unread =
            typeof res.unread_count === "number"
              ? res.unread_count
              : (res.data?.unread_count ?? 0);

          setSubmissions(items);
          if (pagination) {
            setCurrentPage(pagination.current_page || 1);
            setTotalPages(pagination.total_pages || 1);
            setTotalItems(pagination.total_items || 0);
          } else {
            setTotalItems(items.length);
          }
          setUnreadCount(unread);
        }
      } catch (err: unknown) {
        if (err instanceof ApiRequestError) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load contact submissions.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [currentPage, statusFilter, appliedSearch],
  );

  // Load submissions whenever currentPage, statusFilter, or appliedSearch changes
  useEffect(() => {
    let ignore = false;

    const runFetch = async () => {
      try {
        const res = await fetchContactSubmissions(
          currentPage,
          10,
          statusFilter,
          appliedSearch,
        );
        if (!ignore && res.success) {
          const items = res.items ?? res.data?.items ?? [];
          const pagination = res.pagination ?? res.data?.pagination;
          const unread =
            typeof res.unread_count === "number"
              ? res.unread_count
              : (res.data?.unread_count ?? 0);

          setSubmissions(items);
          if (pagination) {
            setTotalPages(pagination.total_pages || 1);
            setTotalItems(pagination.total_items || 0);
          } else {
            setTotalItems(items.length);
          }
          setUnreadCount(unread);
        }
      } catch (err: unknown) {
        if (!ignore) {
          if (err instanceof ApiRequestError) {
            setError(err.message);
          } else if (err instanceof Error) {
            setError(err.message);
          } else {
            setError("Failed to load contact submissions.");
          }
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    runFetch();

    return () => {
      ignore = true;
    };
  }, [currentPage, statusFilter, appliedSearch]);

  // Realtime synchronization: Background polling every 10 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchContactSubmissions(currentPage, 10, statusFilter, appliedSearch)
          .then((res) => {
            if (res.success) {
              const items = res.items ?? res.data?.items ?? [];
              const pagination = res.pagination ?? res.data?.pagination;
              const unread =
                typeof res.unread_count === "number"
                  ? res.unread_count
                  : (res.data?.unread_count ?? 0);

              setSubmissions(items);
              if (pagination) {
                setTotalPages(pagination.total_pages || 1);
                setTotalItems(pagination.total_items || 0);
              } else {
                setTotalItems(items.length);
              }
              setUnreadCount(unread);
            }
          })
          .catch(() => {
            // Non-blocking background catch
          });
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [currentPage, statusFilter, appliedSearch]);

  // Realtime revalidation when window gains focus or visibility returns
  useEffect(() => {
    const handleRevalidate = () => {
      if (document.visibilityState === "visible") {
        refreshData(currentPage, statusFilter, appliedSearch);
      }
    };

    window.addEventListener("focus", handleRevalidate);
    document.addEventListener("visibilitychange", handleRevalidate);

    return () => {
      window.removeEventListener("focus", handleRevalidate);
      document.removeEventListener("visibilitychange", handleRevalidate);
    };
  }, [refreshData, currentPage, statusFilter, appliedSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setAppliedSearch(searchInputValue.trim());
  };

  const handleClearSearch = () => {
    setSearchInputValue("");
    setAppliedSearch("");
    setCurrentPage(1);
  };

  const handleOpenDetail = (item: ContactSubmissionItem) => {
    setActiveItem(item);
    setAdminNotes(item.admin_notes || "");

    // Automatically mark unread item as read when opened
    if (item.status === "unread") {
      updateStatus(item.id, "read", item.admin_notes || undefined, false);
    }
  };

  const updateStatus = async (
    id: number,
    newStatus: "unread" | "read" | "resolved" | "archived",
    notes?: string,
    showToast = true,
  ) => {
    setIsUpdatingStatus(true);
    try {
      const res = await updateContactSubmissionStatus(
        id,
        newStatus,
        notes !== undefined ? notes : adminNotes,
      );

      if (res.success) {
        setSubmissions((prev) => {
          const target = prev.find((s) => s.id === id);
          if (target && target.status === "unread" && newStatus !== "unread") {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
          return prev.map((sub) =>
            sub.id === id
              ? {
                  ...sub,
                  status: newStatus,
                  admin_notes: notes !== undefined ? notes : adminNotes,
                }
              : sub,
          );
        });

        setActiveItem((prev) =>
          prev && prev.id === id
            ? {
                ...prev,
                status: newStatus,
                admin_notes: notes !== undefined ? notes : adminNotes,
              }
            : prev,
        );

        if (showToast) {
          Swal.fire({
            icon: "success",
            title: "Status Updated",
            text: `Submission #${id} marked as ${newStatus}.`,
            timer: 1500,
            showConfirmButton: false,
            background: "var(--color-surface, #0f172a)",
            color: "var(--color-text-primary, #f8fafc)",
            customClass: {
              popup:
                "border border-[var(--color-border)] rounded-xl shadow-2xl max-w-xs text-xs",
            },
          });
        }
      }
    } catch (err: unknown) {
      if (showToast) {
        if (err instanceof ApiRequestError) {
          showFailureAlert(err.failure);
        } else {
          Swal.fire({
            icon: "error",
            title: "Update Failed",
            text:
              err instanceof Error ? err.message : "Unable to update status.",
            background: "var(--color-surface, #0f172a)",
            color: "var(--color-text-primary, #f8fafc)",
            customClass: {
              popup:
                "border border-[var(--color-border)] rounded-xl shadow-2xl max-w-xs text-xs",
            },
          });
        }
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: ContactSubmissionItem["status"]) => {
    switch (status) {
      case "unread":
        return <Badge status="warning">Unread</Badge>;
      case "read":
        return <Badge status="info">Read</Badge>;
      case "resolved":
        return <Badge status="pass">Resolved</Badge>;
      case "archived":
        return <Badge status="neutral">Archived</Badge>;
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "bug_report":
        return "Bug Report";
      case "security_disclosure":
        return "Security Disclosure";
      case "feedback":
        return "Feedback";
      case "other":
        return "Other";
      default:
        return "General";
    }
  };

  const resolvedCount = submissions.filter(
    (s) => s.status === "resolved",
  ).length;

  return (
    <div className="space-y-6">
      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Inquiries"
          value={totalItems}
          subtext="Total submissions recorded"
          icon={Mail}
        />
        <StatCard
          label="Unread Inquiries"
          value={unreadCount}
          subtext="Awaiting review or triage"
          icon={AlertCircle}
          variant={unreadCount > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Resolved on Page"
          value={resolvedCount}
          subtext="Marked resolved by admin"
          icon={CheckCircle2}
          variant="pass"
        />
      </div>

      {/* Main Card with Filter Bar and Submissions Table */}
      <Card>
        <CardHeader className="border-b border-[var(--color-border-subtle)] pb-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
                User Inquiries
              </CardTitle>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Manage communications sent through the public contact portal.
              </p>
            </div>

            {/* Search Input with Clear Button */}
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center gap-2 w-full md:w-80"
            >
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[var(--color-text-muted)] pointer-events-none" />
                <Input
                  type="text"
                  value={searchInputValue}
                  onChange={(e) => setSearchInputValue(e.target.value)}
                  placeholder="Search sender, email, subject..."
                  className="pl-8 pr-7 text-xs py-1.5 bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] border-[var(--color-border)] placeholder:text-[var(--color-text-disabled)]"
                />
                {(searchInputValue || appliedSearch) && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="text-xs py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold shrink-0"
              >
                Search
              </Button>
            </form>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
            {[
              { id: "all", label: "All" },
              { id: "unread", label: "Unread" },
              { id: "read", label: "Read" },
              { id: "resolved", label: "Resolved" },
              { id: "archived", label: "Archived" },
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-colors shrink-0 ${
                    isActive
                      ? "bg-blue-600 text-white font-semibold shadow-xs"
                      : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {error && (
            <div className="p-3.5 flex items-center justify-between gap-2 text-[var(--color-status-fail-text)] text-xs bg-[var(--color-status-fail-bg)] border-b border-[var(--color-border-subtle)]">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  refreshData(currentPage, statusFilter, appliedSearch)
                }
                className="text-xs py-0.5 px-2 shrink-0"
              >
                Retry
              </Button>
            </div>
          )}

          {isLoading && submissions.length === 0 ? (
            <LoadingState
              message="Loading contact submissions..."
              className="py-14"
            />
          ) : submissions.length === 0 ? (
            <EmptyState
              icon={<Inbox className="size-6 text-[var(--color-text-muted)]" />}
              title="No contact submissions found"
              description={
                appliedSearch
                  ? `No inquiries match "${appliedSearch}". Try resetting search.`
                  : statusFilter !== "all"
                    ? "No submissions under this category filter."
                    : "User inquiries submitted via the public contact form will appear here."
              }
              action={
                appliedSearch ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleClearSearch}
                    className="mt-3 text-xs"
                  >
                    Clear Search
                  </Button>
                ) : undefined
              }
              className="py-14"
            />
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[900px] table-fixed border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] uppercase tracking-wider text-[10px] sm:text-[11px]">
                    <th className="w-[130px] border-r border-b border-[var(--color-border)] px-4 py-3 font-bold">
                      Date
                    </th>
                    <th className="w-[190px] border-r border-b border-[var(--color-border)] px-4 py-3 font-bold">
                      Sender
                    </th>
                    <th className="w-[160px] border-r border-b border-[var(--color-border)] px-4 py-3 font-bold">
                      Category
                    </th>
                    <th className="border-r border-b border-[var(--color-border)] px-4 py-3 font-bold">
                      Subject
                    </th>
                    <th className="w-[125px] border-r border-b border-[var(--color-border)] px-4 py-3 font-bold">
                      Status
                    </th>
                    <th className="w-[110px] border-b border-[var(--color-border)] px-4 py-3 text-center font-bold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="text-[var(--color-text-secondary)]">
                  {submissions.map((sub, index) => (
                    <tr
                      key={sub.id}
                      className={[
                        "transition-colors duration-150",
                        "border-b border-[var(--color-border-subtle)]",
                        index % 2 === 0
                          ? "bg-[var(--color-surface)]"
                          : "bg-[var(--color-surface-secondary)]/60",
                        "hover:bg-[var(--color-surface-hover)]",
                        sub.status === "unread"
                          ? "border-l-2 border-l-blue-500"
                          : "border-l-2 border-l-transparent",
                      ].join(" ")}
                    >
                      {/* Date */}
                      <td className="border-r border-[var(--color-border-subtle)] px-4 py-3.5 align-middle whitespace-nowrap text-[var(--color-text-muted)]">
                        {new Date(sub.created_at).toLocaleString("en-US", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>

                      {/* Sender */}
                      <td className="border-r border-[var(--color-border-subtle)] px-4 py-3.5 align-middle">
                        <div className="truncate font-semibold text-[var(--color-text-primary)]">
                          {sub.name}
                        </div>
                        <div
                          className="mt-0.5 truncate text-[10px] sm:text-[11px] text-[var(--color-text-muted)] font-mono"
                          title={sub.email}
                        >
                          {sub.email}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="border-r border-[var(--color-border-subtle)] px-4 py-3.5 align-middle">
                        <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-2 py-1 text-[10px] sm:text-[11px] text-[var(--color-text-secondary)]">
                          <Tag className="size-3 shrink-0 text-[var(--color-text-muted)]" />
                          <span className="truncate">
                            {getCategoryLabel(sub.category)}
                          </span>
                        </span>
                      </td>

                      {/* Subject */}
                      <td
                        className="border-r border-[var(--color-border-subtle)] px-4 py-3.5 align-middle"
                        title={sub.subject}
                      >
                        <span className="block truncate text-[var(--color-text-primary)]">
                          {sub.subject}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="border-r border-[var(--color-border-subtle)] px-4 py-3.5 align-middle whitespace-nowrap">
                        {getStatusBadge(sub.status)}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 align-middle text-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenDetail(sub)}
                          leftIcon={<Eye className="size-3.5" />}
                          className="whitespace-nowrap text-xs py-1 px-2.5 bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
                        >
                          Detail
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* Consistent Pagination Section */}
        {totalItems > 0 && (
          <CardFooter className="border-t border-[var(--color-border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5">
            <span className="text-xs text-[var(--color-text-muted)]">
              Showing {submissions.length} of {totalItems} submissions
            </span>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </CardFooter>
        )}
      </Card>

      {/* Sleek, Compact Detail Modal */}
      {activeItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        >
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl max-w-md sm:max-w-lg w-full p-4 sm:p-5 space-y-3.5 shadow-2xl relative">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[var(--color-border-subtle)] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2
                    id="contact-modal-title"
                    className="text-base font-bold text-[var(--color-text-primary)]"
                  >
                    Inquiry #{activeItem.id}
                  </h2>
                  {getStatusBadge(activeItem.status)}
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                  Received on{" "}
                  {new Date(activeItem.created_at).toLocaleString("en-US")}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveItem(null)}
                aria-label="Close modal"
                className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Sender Metadata Compact Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-[var(--color-surface-secondary)] p-2.5 rounded-lg border border-[var(--color-border-subtle)]">
              <div>
                <span className="text-[10px] text-[var(--color-text-muted)] font-medium uppercase tracking-wider block">
                  Sender
                </span>
                <p className="text-[var(--color-text-primary)] font-semibold truncate">
                  {activeItem.name}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-[var(--color-text-muted)] font-medium uppercase tracking-wider block">
                  Email
                </span>
                <p className="text-[var(--color-text-primary)] font-mono truncate">
                  {activeItem.email}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-[var(--color-text-muted)] font-medium uppercase tracking-wider block">
                  Category
                </span>
                <p className="text-[var(--color-text-secondary)]">
                  {getCategoryLabel(activeItem.category)}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-[var(--color-text-muted)] font-medium uppercase tracking-wider block">
                  Source IP
                </span>
                <p className="text-[var(--color-text-muted)] font-mono">
                  {activeItem.ip_address}
                </p>
              </div>
            </div>

            {/* Subject & Message Content */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
                Subject:
              </span>
              <div className="text-xs font-bold text-[var(--color-text-primary)] bg-[var(--color-surface-secondary)] p-2 rounded border border-[var(--color-border-subtle)] truncate">
                {activeItem.subject}
              </div>

              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] block pt-1">
                Message Body:
              </span>
              <div className="text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap font-sans bg-[var(--color-surface-subtle)] p-3 rounded-lg border border-[var(--color-border-subtle)] max-h-32 overflow-y-auto leading-relaxed">
                {activeItem.message}
              </div>
            </div>

            {/* Admin Resolution Notes */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="admin_notes"
                  className="text-[11px] font-semibold text-[var(--color-text-secondary)]"
                >
                  Admin Notes:
                </label>
                {adminNotes !== (activeItem.admin_notes || "") && (
                  <button
                    type="button"
                    onClick={() =>
                      updateStatus(activeItem.id, activeItem.status, adminNotes)
                    }
                    disabled={isUpdatingStatus}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer transition-colors"
                  >
                    Save Notes
                  </button>
                )}
              </div>
              <textarea
                id="admin_notes"
                rows={2}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Internal notes regarding follow-up, triage, or remediation..."
                className="w-full p-2 text-xs bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-md focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[var(--color-border-subtle)]">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[var(--color-text-muted)] mr-1">
                  Status:
                </span>
                <button
                  type="button"
                  onClick={() => updateStatus(activeItem.id, "read")}
                  disabled={isUpdatingStatus}
                  className={`text-xs py-1 px-2.5 rounded-md font-medium transition-colors ${
                    activeItem.status === "read"
                      ? "bg-blue-600 text-white font-semibold"
                      : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)]"
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <BookOpen className="size-3" />
                    Read
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(activeItem.id, "resolved")}
                  disabled={isUpdatingStatus}
                  className={`text-xs py-1 px-2.5 rounded-md font-medium transition-colors ${
                    activeItem.status === "resolved"
                      ? "bg-emerald-600 text-white font-semibold"
                      : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)]"
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="size-3" />
                    Resolved
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(activeItem.id, "archived")}
                  disabled={isUpdatingStatus}
                  className={`text-xs py-1 px-2.5 rounded-md font-medium transition-colors ${
                    activeItem.status === "archived"
                      ? "bg-slate-700 text-white font-semibold"
                      : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)]"
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Archive className="size-3" />
                    Archive
                  </span>
                </button>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveItem(null)}
                className="text-xs py-1 px-3 bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
