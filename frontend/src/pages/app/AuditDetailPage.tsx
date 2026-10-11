import React, { useState } from "react";
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  FileSearch,
  Globe,
  ExternalLink,
} from "lucide-react";
import { Link } from "../../app/router";
import { useNavigate, useParams } from "../../app/router-context";
import {
  Button,
  Badge,
  Card,
  PageHeader,
  EmptyState,
} from "../../components/common";
import { findAuditById, fetchAuditByIdAsync } from "../../services/auditStorage";
import type { AuditRecord } from "../../types/audit";

export const AuditDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [audit, setAudit] = useState<AuditRecord | null>(() => (id ? findAuditById(id) : null));
  const [isLoading, setIsLoading] = useState<boolean>(() => !audit && Boolean(id));
  const [filter, setFilter] = useState<
    "ALL" | "ISSUES" | "PASSED" | "FAILED" | "WARNINGS" | "NOT_CHECKED" | "MANUAL_REQUIRED"
  >("ALL");

  React.useEffect(() => {
    if (!id || findAuditById(id)) return;

    let isMounted = true;
    fetchAuditByIdAsync(id).then((res) => {
      if (isMounted) {
        setAudit(res);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="size-8 rounded-full border-2 border-sky-600 border-t-transparent animate-spin" />
        <p className="text-xs font-mono text-slate-500">Loading audit report from server...</p>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto py-12">
        <EmptyState
          icon={<AlertTriangle className="size-8 text-amber-600" />}
          title="Audit Report Not Found"
          description="The requested audit report ID does not exist in your current ephemeral browser session, or has expired."
          action={
            <Button
              variant="primary"
              leftIcon={<ArrowLeft className="size-4" />}
              onClick={() => navigate("/audits")}
            >
              Return to Audit History
            </Button>
          }
        />
      </div>
    );
  }

  const filteredFindings = audit.findings.filter((f) => {
    if (filter === "ISSUES") return f.status === "FAIL" || f.status === "WARNING";
    if (filter === "PASSED") return f.status === "PASS";
    if (filter === "FAILED") return f.status === "FAIL";
    if (filter === "WARNINGS") return f.status === "WARNING";
    if (filter === "NOT_CHECKED") return f.status === "NOT_CHECKED";
    if (filter === "MANUAL_REQUIRED") return f.status === "MANUAL_REQUIRED";
    return true;
  });

  const handleExportJson = () => {
    const jsonBlob = new Blob([JSON.stringify(audit, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(jsonBlob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `xeoo-audit-${audit.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const renderFormattedRecommendation = (recommendation: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = recommendation.split(urlRegex);

    return (
      <div className="space-y-2">
        <p className="text-xs sm:text-[13px] leading-relaxed text-[var(--color-text-primary)] font-medium">
          {parts.map((part, i) => {
            if (part.match(urlRegex)) {
              let label = "Visit Recommended Tool";
              if (part.includes("sitemap-generator")) {
                label = "Open Sitemap Generator (XeooTools)";
              } else if (part.includes("robots-txt-generator")) {
                label = "Open Robots.txt Generator (XeooTools)";
              }
              return (
                <a
                  key={i}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-xs text-[var(--color-brand-primary)] hover:underline mx-1 bg-[var(--color-brand-subtle)] px-2 py-0.5 rounded-[var(--radius-xs)] border border-[var(--color-brand-border)] transition-all hover:bg-[var(--color-brand-primary)] hover:text-white align-middle"
                >
                  <span>{label}</span>
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Back button link */}
      <div>
        <Link
          to="/audits"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-brand-primary)] hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Audit History</span>
        </Link>
      </div>

      {/* Page Header */}
      <PageHeader
        title={audit.url}
        description={`Inspected on ${new Date(audit.createdAt).toLocaleString()} in ${audit.durationMs}ms`}
        badge={
          audit.isDemo ? (
            <Badge status="warning">DEMO DATA — SAMPLE</Badge>
          ) : (
            <Badge status="pass" showDot>SESSION AUDIT</Badge>
          )
        }
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="size-3.5" />}
              onClick={handleExportJson}
            >
              Export JSON
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Globe className="size-3.5" />}
              onClick={() => navigate("/audit")}
            >
              Audit Another
            </Button>
          </div>
        }
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
        <div className="p-3.5 rounded-[var(--radius-sm)] border border-[var(--color-brand-border)] bg-[var(--color-brand-subtle)]/30 col-span-2 sm:col-span-1 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-[var(--color-text-muted)] uppercase block">OVERALL SCORE</span>
          <span className="text-3xl font-black font-sans text-[var(--color-brand-primary)]">{audit.score}/100</span>
        </div>
        <button
          type="button"
          onClick={() => setFilter(filter === "PASSED" ? "ALL" : "PASSED")}
          className={`p-3.5 rounded-[var(--radius-sm)] bg-[var(--color-status-pass-bg)] border transition-all text-left cursor-pointer ${
            filter === "PASSED"
              ? "ring-2 ring-[var(--color-status-pass)] border-[var(--color-status-pass)] shadow-xs"
              : "border-[var(--color-status-pass-border)] hover:border-[var(--color-status-pass)]"
          }`}
        >
          <span className="text-[11px] font-bold text-[var(--color-status-pass-text)] block tracking-wide">PASSED CHECKS</span>
          <span className="text-2xl font-black font-mono text-[var(--color-status-pass-text)]">{audit.summary.pass}</span>
        </button>
        <button
          type="button"
          onClick={() => setFilter(filter === "FAILED" ? "ALL" : "FAILED")}
          className={`p-3.5 rounded-[var(--radius-sm)] bg-[var(--color-status-fail-bg)] border transition-all text-left cursor-pointer ${
            filter === "FAILED"
              ? "ring-2 ring-[var(--color-status-fail)] border-[var(--color-status-fail)] shadow-xs"
              : "border-[var(--color-status-fail-border)] hover:border-[var(--color-status-fail)]"
          }`}
        >
          <span className="text-[11px] font-bold text-[var(--color-status-fail-text)] block tracking-wide">FAILED DEFECTS</span>
          <span className="text-2xl font-black font-mono text-[var(--color-status-fail-text)]">{audit.summary.fail}</span>
        </button>
        <button
          type="button"
          onClick={() => setFilter(filter === "WARNINGS" ? "ALL" : "WARNINGS")}
          className={`p-3.5 rounded-[var(--radius-sm)] bg-[var(--color-status-warning-bg)] border transition-all text-left cursor-pointer ${
            filter === "WARNINGS"
              ? "ring-2 ring-[var(--color-status-warning)] border-[var(--color-status-warning)] shadow-xs"
              : "border-[var(--color-status-warning-border)] hover:border-[var(--color-status-warning)]"
          }`}
        >
          <span className="text-[11px] font-bold text-[var(--color-status-warning-text)] block tracking-wide">WARNINGS</span>
          <span className="text-2xl font-black font-mono text-[var(--color-status-warning-text)]">{audit.summary.warning}</span>
        </button>
        <button
          type="button"
          onClick={() => setFilter(filter === "NOT_CHECKED" ? "ALL" : "NOT_CHECKED")}
          className={`p-3.5 rounded-[var(--radius-sm)] bg-[var(--color-status-not-checked-bg)] border transition-all text-left cursor-pointer ${
            filter === "NOT_CHECKED"
              ? "ring-2 ring-[var(--color-status-not-checked)] border-[var(--color-status-not-checked)] shadow-xs"
              : "border-[var(--color-status-not-checked-border)] hover:border-[var(--color-status-not-checked)]"
          }`}
        >
          <span className="text-[11px] font-bold text-[var(--color-status-not-checked-text)] block tracking-wide">NOT CHECKED</span>
          <span className="text-2xl font-black font-mono text-[var(--color-status-not-checked-text)]">{audit.summary.notChecked}</span>
        </button>
      </div>

      {/* Findings Section */}
      <div className="space-y-4">
        {/* Filter Bar with Complete Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 border-b border-[var(--color-border)] pb-3 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-[var(--radius-sm)] transition-all cursor-pointer flex items-center gap-1.5 ${
              filter === "ALL"
                ? "bg-[var(--color-brand-primary)] text-white shadow-xs"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)]"
            }`}
          >
            <span>All Findings</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              filter === "ALL" ? "bg-white/25 text-white" : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
            }`}>
              {audit.findings.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("PASSED")}
            className={`px-3 py-1.5 rounded-[var(--radius-sm)] transition-all cursor-pointer flex items-center gap-1.5 ${
              filter === "PASSED"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)]"
            }`}
          >
            <span>Passed Checks</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              filter === "PASSED" ? "bg-white/25 text-white" : "bg-emerald-500/10 text-emerald-600"
            }`}>
              {audit.summary.pass}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("FAILED")}
            className={`px-3 py-1.5 rounded-[var(--radius-sm)] transition-all cursor-pointer flex items-center gap-1.5 ${
              filter === "FAILED"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)]"
            }`}
          >
            <span>Failed Defects</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              filter === "FAILED" ? "bg-white/25 text-white" : "bg-rose-500/10 text-rose-600"
            }`}>
              {audit.summary.fail}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("WARNINGS")}
            className={`px-3 py-1.5 rounded-[var(--radius-sm)] transition-all cursor-pointer flex items-center gap-1.5 ${
              filter === "WARNINGS"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)]"
            }`}
          >
            <span>Warnings</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              filter === "WARNINGS" ? "bg-white/25 text-white" : "bg-amber-500/10 text-amber-600"
            }`}>
              {audit.summary.warning}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("NOT_CHECKED")}
            className={`px-3 py-1.5 rounded-[var(--radius-sm)] transition-all cursor-pointer flex items-center gap-1.5 ${
              filter === "NOT_CHECKED"
                ? "bg-slate-700 text-white shadow-xs"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)]"
            }`}
          >
            <span>Not Checked</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              filter === "NOT_CHECKED" ? "bg-white/25 text-white" : "bg-slate-500/10 text-slate-500"
            }`}>
              {audit.summary.notChecked}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("MANUAL_REQUIRED")}
            className={`px-3 py-1.5 rounded-[var(--radius-sm)] transition-all cursor-pointer flex items-center gap-1.5 ${
              filter === "MANUAL_REQUIRED"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)]"
            }`}
          >
            <span>Manual Required</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              filter === "MANUAL_REQUIRED" ? "bg-white/25 text-white" : "bg-indigo-500/10 text-indigo-600"
            }`}>
              {audit.summary.manualRequired}
            </span>
          </button>

          {audit.summary.fail + audit.summary.warning > 0 && (
            <button
              type="button"
              onClick={() => setFilter("ISSUES")}
              className={`px-3 py-1.5 rounded-[var(--radius-sm)] transition-all cursor-pointer flex items-center gap-1.5 ml-auto ${
                filter === "ISSUES"
                  ? "bg-rose-700 text-white shadow-xs"
                  : "text-rose-600 hover:bg-rose-50 border border-rose-200 dark:border-rose-900/50"
              }`}
            >
              <span>Issues & Warnings</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-700">
                {audit.summary.fail + audit.summary.warning}
              </span>
            </button>
          )}
        </div>

        {/* Findings List */}
        <div className="space-y-3.5">
          {filteredFindings.map((finding) => (
            <Card key={finding.id} className="p-4 sm:p-5 space-y-3 hover:border-[var(--color-border-strong)] transition-colors shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {finding.status === "PASS" && <CheckCircle2 className="size-4.5 text-emerald-600 shrink-0" />}
                  {finding.status === "FAIL" && <XCircle className="size-4.5 text-rose-600 shrink-0" />}
                  {finding.status === "WARNING" && <AlertTriangle className="size-4.5 text-amber-500 shrink-0" />}
                  {finding.status === "NOT_CHECKED" && <HelpCircle className="size-4.5 text-slate-400 shrink-0" />}
                  {finding.status === "MANUAL_REQUIRED" && <FileSearch className="size-4.5 text-sky-600 shrink-0" />}
                  <h4 className="text-sm sm:text-base font-bold text-[var(--color-text-primary)]">
                    {finding.title}
                  </h4>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
                    {finding.category.replace("_", " ")}
                  </span>
                  <Badge
                    status={
                      finding.status === "PASS"
                        ? "pass"
                        : finding.status === "FAIL"
                        ? "fail"
                        : finding.status === "WARNING"
                        ? "warning"
                        : finding.status === "NOT_CHECKED"
                        ? "not_checked"
                        : "manual"
                    }
                    size="sm"
                  >
                    {finding.status}
                  </Badge>
                </div>
              </div>

              <p className="text-xs sm:text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
                {finding.description}
              </p>

              {finding.evidence && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-wider block">
                    Technical Evidence / Inspected Content:
                  </span>
                  <pre className="p-3 rounded-[var(--radius-xs)] bg-slate-900 text-slate-100 font-mono text-[11px] max-h-28 overflow-y-auto border border-slate-800 whitespace-pre-wrap break-all leading-relaxed shadow-inner">
                    <code>{finding.evidence}</code>
                  </pre>
                </div>
              )}

              {finding.recommendation && (
                <div className="p-3 sm:p-3.5 rounded-[var(--radius-xs)] bg-[var(--color-surface-secondary)] border-l-4 border-l-[var(--color-brand-primary)] border-t border-r border-b border-[var(--color-border)] text-xs space-y-1.5 shadow-xs">
                  <div className="font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[var(--color-brand-primary)]">
                    <span>💡 Recommendations & Remediation:</span>
                  </div>
                  {renderFormattedRecommendation(finding.recommendation)}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

