import React, { useState } from "react";
import {
  History,
  Plus,
  ArrowRight,
  Globe,
  Clock,
  SearchCheck,
} from "lucide-react";
import { Link } from "../../app/router";
import { useNavigate } from "../../app/router-context";
import {
  Button,
  Badge,
  Card,
  CardContent,
  PageHeader,
  EmptyState,
} from "../../components/common";
import { getSessionAudits, SAMPLE_AUDIT_RECORD } from "../../services/auditStorage";
import type { AuditRecord } from "../../types/audit";

export const AuditHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [audits] = useState<AuditRecord[]>(() => getSessionAudits());

  return (
    <div className="space-y-8">
      <PageHeader
        title="Audit History"
        description="Inspect and review completed technical reports from your active session."
        action={
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="size-4" />}
            onClick={() => navigate("/audit")}
          >
            New Audit
          </Button>
        }
      />

      {/* Featured Sample Report Card */}
      <Card className="border-[var(--color-brand-border)] bg-[var(--color-brand-subtle)]/40">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <SearchCheck className="size-4 text-[var(--color-brand-primary)]" />
              <span className="text-xs font-bold font-mono text-[var(--color-brand-primary)] uppercase">
                Interactive Sample Report
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Explore how findings, raw evidence, and actionable remediation are structured for <code className="xa-code">https://example.com</code>.
            </p>
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate(`/audits/${SAMPLE_AUDIT_RECORD.id}`)}
            rightIcon={<ArrowRight className="size-3.5" />}
          >
            Open Sample Report
          </Button>
        </CardContent>
      </Card>

      {/* Session Audits Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-primary)] font-mono">
            Active Session Audits ({audits.length})
          </h3>
          <span className="text-xs text-[var(--color-text-muted)]">
            Stored in local session memory
          </span>
        </div>

        {audits.length === 0 ? (
          <EmptyState
            icon={<History className="size-6" />}
            title="No session audits conducted yet"
            description="You have not launched any audits during this browsing session. Submit a website URL to generate your first technical health report."
            action={
              <Button
                variant="primary"
                leftIcon={<Plus className="size-4" />}
                onClick={() => navigate("/audit")}
              >
                Launch First Audit
              </Button>
            }
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block xa-table-container">
              <table className="xa-table">
                <thead>
                  <tr>
                    <th>Target Website URL</th>
                    <th>Timestamp</th>
                    <th>Score</th>
                    <th>Passed</th>
                    <th>Issues</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map((audit) => (
                    <tr key={audit.id}>
                      <td className="font-mono font-semibold text-[var(--color-text-primary)]">
                        <Link
                          to={`/audits/${audit.id}`}
                          className="hover:text-[var(--color-brand-primary)] hover:underline inline-flex items-center gap-1.5"
                        >
                          <Globe className="size-3.5 text-[var(--color-brand-secondary)] shrink-0" />
                          <span className="truncate max-w-xs">{audit.url}</span>
                        </Link>
                      </td>
                      <td className="font-mono text-xs text-[var(--color-text-muted)]">
                        {new Date(audit.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <Badge status="pass" size="sm">Score {audit.score}</Badge>
                      </td>
                      <td className="font-mono text-[var(--color-status-pass-text)]">
                        {audit.summary.pass}
                      </td>
                      <td className="font-mono text-[var(--color-status-fail-text)]">
                        {audit.summary.fail + audit.summary.warning}
                      </td>
                      <td className="text-right">
                        <Link
                          to={`/audits/${audit.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-brand-primary)] hover:underline"
                        >
                          <span>View Report</span>
                          <ArrowRight className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="sm:hidden space-y-3">
              {audits.map((audit) => (
                <Card key={audit.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono font-bold text-xs text-[var(--color-text-primary)] break-all">
                      {audit.url}
                    </span>
                    <Badge status="pass" size="sm">Score {audit.score}</Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {new Date(audit.createdAt).toLocaleTimeString()}
                    </span>
                    <span>
                      {audit.summary.pass} Pass / {audit.summary.fail + audit.summary.warning} Issues
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-center"
                    onClick={() => navigate(`/audits/${audit.id}`)}
                    rightIcon={<ArrowRight className="size-3.5" />}
                  >
                    View Details
                  </Button>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

