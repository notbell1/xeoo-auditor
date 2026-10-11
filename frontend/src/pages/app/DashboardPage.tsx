import React, { useState, useEffect } from "react";
import {
  Globe,
  Plus,
  History,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  FileSearch,
  ArrowRight,
  ExternalLink,
  User,
  LockKeyhole,
  KeyRound,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Swal from "sweetalert2";
import { Link } from "../../app/router";
import { useNavigate } from "../../app/router-context";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  PageHeader,
  Input,
} from "../../components/common";
import { getSessionAudits, SAMPLE_AUDIT_RECORD } from "../../services/auditStorage";
import { verifyAdminSession, updateAdminProfile } from "../../services/adminAuth";
import { showFailureAlert } from "../../lib/securityAlert";
import type { AuditRecord } from "../../types/audit";

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [sessionAudits] = useState<AuditRecord[]>(() => getSessionAudits());

  // Credentials management state
  const [currentUsername, setCurrentUsername] = useState<string>("nttbell");
  const [formUsername, setFormUsername] = useState<string>("nttbell");
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    verifyAdminSession().then((res) => {
      if (res.authenticated && res.user?.username) {
        setCurrentUsername(res.user.username);
        setFormUsername(res.user.username);
      }
    });
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateSuccess(null);
    setUpdateError(null);

    if (!currentPassword) {
      const msg = "Current password is required to authorize changes.";
      setUpdateError(msg);
      Swal.fire({
        icon: "warning",
        title: "Verification Required",
        text: msg,
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    if (!formUsername.trim()) {
      const msg = "Username cannot be empty.";
      setUpdateError(msg);
      Swal.fire({
        icon: "warning",
        title: "Invalid Input",
        text: msg,
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    if (newPassword && newPassword.length < 8) {
      const msg = "New password must be at least 8 characters.";
      setUpdateError(msg);
      Swal.fire({
        icon: "warning",
        title: "Password Too Short",
        text: msg,
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      const msg = "New password confirmation does not match.";
      setUpdateError(msg);
      Swal.fire({
        icon: "error",
        title: "Password Mismatch",
        text: msg,
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const res = await updateAdminProfile(
        currentPassword,
        formUsername.trim(),
        newPassword || undefined
      );

      if (res.success) {
        const successMsg = res.message || "Profile credentials updated successfully.";
        setUpdateSuccess(successMsg);
        if (res.user?.username) {
          setCurrentUsername(res.user.username);
          setFormUsername(res.user.username);
        }
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        Swal.fire({
          icon: "success",
          title: "Successfully Updated!",
          text: "New username and password saved to database.",
          confirmButtonColor: "#2563eb",
        });
      } else {
        const errorMsg = res.error || "Failed to update profile credentials.";
        setUpdateError(errorMsg);
        showFailureAlert(res.failure);
      }
    } catch {
      const netMsg = "Network error while updating profile.";
      setUpdateError(netMsg);
      Swal.fire({
        icon: "error",
        title: "Network Error",
        text: netMsg,
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setIsUpdating(false);
    }
  };


  const totalAuditsCount = sessionAudits.length;
  const totalPassedCount = sessionAudits.reduce((acc, a) => acc + a.summary.pass, 0);
  const totalIssuesCount = sessionAudits.reduce(
    (acc, a) => acc + a.summary.fail + a.summary.warning,
    0
  );


  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Operational overview of website health signals, active session inspection metrics, and security boundaries."
        action={
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="size-4" />}
            onClick={() => navigate("/audit")}
          >
            New Website Audit
          </Button>
        }
      />

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
              Session Audits
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-[var(--color-text-primary)]">
                {totalAuditsCount}
              </span>
            </div>
            <span className="text-[11px] text-[var(--color-text-muted)] mt-1">
              Ephemeral run records
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
              Checks Passed
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-[var(--color-status-pass-text)]">
                {totalPassedCount}
              </span>
            </div>
            <span className="text-[11px] text-[var(--color-text-muted)] mt-1">
              Verified compliant modules
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
              Issues & Warnings
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-[var(--color-text-primary)]">
                {totalIssuesCount}
              </span>
            </div>
            <span className="text-[11px] text-[var(--color-text-muted)] mt-1">
              Requires attention or fix
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
              SSRF Defense
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold font-sans text-[var(--color-text-primary)]">
                Strict
              </span>
            </div>
            <span className="text-[11px] text-[var(--color-text-muted)] mt-1">
              Blocks private subnets & rebinds
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Quick Launch & Recent Audits Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Quick Launch Card */}
        <Card className="lg:col-span-5 bg-[var(--color-surface)]">
          <CardHeader>
            <CardTitle>Launch Website Inspection</CardTitle>
            <CardDescription>
              Enter a public domain to verify SSL/TLS, sitemaps, robots.txt, canonical tags, and HTTP headers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              XeooAuditor conducts non-destructive bounded requests. Target destination IP addresses are resolved and verified against SSRF blocklists at connection time.
            </p>
            <Button
              variant="primary"
              className="w-full justify-center"
              leftIcon={<Globe className="size-4" />}
              onClick={() => navigate("/audit")}
            >
              Start New Audit
            </Button>
          </CardContent>
        </Card>

        {/* Recent Audits Card */}
        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Session Audits</CardTitle>
              <CardDescription>
                Audits generated during your current browser session.
              </CardDescription>
            </div>
            <Link
              to="/audits"
              className="text-xs font-semibold text-[var(--color-brand-primary)] hover:underline inline-flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {sessionAudits.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <History className="size-8 mx-auto text-[var(--color-text-muted)]" />
                <p className="text-xs text-[var(--color-text-muted)]">
                  No audits run in this session yet. Explore the sample demo report or start a new audit.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Link
                    to={`/audits/${SAMPLE_AUDIT_RECORD.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                  >
                    <span>View Sample Demo Report</span>
                    <ExternalLink className="size-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {sessionAudits.slice(0, 3).map((audit) => (
                  <Link
                    key={audit.id}
                    to={`/audits/${audit.id}`}
                    className="flex items-center justify-between p-3 rounded-[var(--radius-sm)] bg-[var(--color-surface-secondary)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)] transition-colors"
                  >
                    <div className="min-w-0 pr-3">
                      <span className="text-xs font-bold font-mono text-[var(--color-text-primary)] truncate block">
                        {audit.url}
                      </span>
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        {new Date(audit.createdAt).toLocaleTimeString()} • {audit.findings.length} findings
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge status="pass" size="sm">Score {audit.score}</Badge>
                      <ArrowRight className="size-3.5 text-[var(--color-text-muted)]" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Admin Profile & Credentials Settings Card */}
      <Card className="border-[var(--color-border-strong)] shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-[var(--color-brand-primary)]" />
              <CardTitle>Account Credentials & Security</CardTitle>
            </div>
            <CardDescription>
              Manage administrator authentication credentials stored in the <code className="text-xs font-mono px-1 py-0.5 rounded bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">users</code> database table.
            </CardDescription>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-secondary)]">
            <User className="size-3.5 text-[var(--color-text-muted)]" />
            <span>Active Admin: <strong className="text-[var(--color-text-primary)]">{currentUsername}</strong></span>
          </div>
        </CardHeader>
        <CardContent>
          {updateSuccess && (
            <div className="mb-4 p-3 rounded-[var(--radius-sm)] bg-[var(--color-status-pass-bg)] border border-[var(--color-status-pass-border)] text-[var(--color-status-pass-text)] text-xs flex items-center gap-2">
              <Check className="size-4 shrink-0 text-[var(--color-status-pass)]" />
              <span>{updateSuccess}</span>
            </div>
          )}

          {updateError && (
            <div className="mb-4 p-3 rounded-[var(--radius-sm)] bg-[var(--color-status-fail-bg)] border border-[var(--color-status-fail-border)] text-[var(--color-status-fail-text)] text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0 text-[var(--color-status-fail)]" />
              <span>{updateError}</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Current Password (Required)"
                  type="password"
                  placeholder="Enter current password to verify"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  leftIcon={<LockKeyhole className="size-4" />}
                  required
                />
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                  Required to authorize any credential changes.
                </p>
              </div>

              <div>
                <Input
                  label="Administrator Username"
                  type="text"
                  placeholder="e.g. nttbell"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  leftIcon={<User className="size-4" />}
                  required
                />
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                  Unique identifier used for authentication.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[var(--color-border-subtle)]">
              <div>
                <Input
                  label="New Password (Optional)"
                  type="password"
                  placeholder="Leave empty to keep current password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  leftIcon={<LockKeyhole className="size-4" />}
                />
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                  Minimum 8 characters with letters, numbers, and symbols.
                </p>
              </div>

              <div>
                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  leftIcon={<LockKeyhole className="size-4" />}
                  disabled={!newPassword}
                />
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                  Must match the new password above.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={isUpdating || !currentPassword}
                leftIcon={isUpdating ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              >
                {isUpdating ? "Updating Credentials..." : "Save Credential Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Audit Classification Standards Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Finding Classification Standards</CardTitle>
          <CardDescription>
            XeooAuditor reports adhere to strict classification semantics as mandated by system rules.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-[var(--radius-sm)] border border-[var(--color-status-pass-border)] bg-[var(--color-status-pass-bg)] flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-[var(--color-status-pass)]" />
                <Badge status="pass">PASS</Badge>
              </div>
              <p className="text-xs text-[var(--color-status-pass-text)] mt-1 leading-relaxed">
                Verified compliant check with concrete positive proof.
              </p>
            </div>

            <div className="p-3.5 rounded-[var(--radius-sm)] border border-[var(--color-status-fail-border)] bg-[var(--color-status-fail-bg)] flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <XCircle className="size-4 text-[var(--color-status-fail)]" />
                <Badge status="fail">FAIL</Badge>
              </div>
              <p className="text-xs text-[var(--color-status-fail-text)] mt-1 leading-relaxed">
                Conclusive defect or critical security vulnerability.
              </p>
            </div>

            <div className="p-3.5 rounded-[var(--radius-sm)] border border-[var(--color-status-warning-border)] bg-[var(--color-status-warning-bg)] flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="size-4 text-[var(--color-status-warning)]" />
                <Badge status="warning">WARNING</Badge>
              </div>
              <p className="text-xs text-[var(--color-status-warning-text)] mt-1 leading-relaxed">
                Advisory issue, missing header, or suboptimal configuration.
              </p>
            </div>

            <div className="p-3.5 rounded-[var(--radius-sm)] border border-[var(--color-status-not-checked-border)] bg-[var(--color-status-not-checked-bg)] flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <HelpCircle className="size-4 text-[var(--color-status-not-checked)]" />
                <Badge status="not_checked">NOT_CHECKED</Badge>
              </div>
              <p className="text-xs text-[var(--color-status-not-checked-text)] mt-1 leading-relaxed">
                Check skipped due to rate limit, timeout, or scope boundary.
              </p>
            </div>

            <div className="p-3.5 rounded-[var(--radius-sm)] border border-[var(--color-status-manual-border)] bg-[var(--color-status-manual-bg)] flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <FileSearch className="size-4 text-[var(--color-status-manual)]" />
                <Badge status="manual">MANUAL_REQ</Badge>
              </div>
              <p className="text-xs text-[var(--color-status-manual-text)] mt-1 leading-relaxed">
                Requires human review or external platform authorization.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

