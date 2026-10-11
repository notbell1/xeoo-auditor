import React, { useState, useEffect } from "react";
import {
  LockKeyhole,
  User,
  KeyRound,
  SlidersHorizontal,
  Save,
  Loader2,
} from "lucide-react";
import Swal from "sweetalert2";
import { Button } from "../../components/common/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/common/Card";
import { Input } from "../../components/common/Input";
import { LoadingState } from "../../components/common/LoadingState";
import { ErrorState } from "../../components/common/EmptyState";
import {
  fetchSystemSettings,
  updateSystemSettings,
  type SystemSettingsData,
} from "../../services/adminApi";
import { updateAdminProfile } from "../../services/adminAuth";
import { ApiRequestError } from "../../services/apiError";
import { showFailureAlert } from "../../lib/securityAlert";

export const AdminSettingsPage: React.FC = () => {
  const [data, setData] = useState<SystemSettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable Execution Limits & Retention Form state
  const [limits, setLimits] = useState({
    max_pages_per_audit: 10,
    request_timeout_seconds: 8,
    max_response_size_kb: 2048,
    max_redirects: 3,
    max_concurrent_audits: 2,
    audit_retention_days: 7,
    log_retention_days: 30,
    error_retention_days: 30,
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Profile Credential Update Form state
  const [currentUsername, setCurrentUsername] = useState("nttbell");
  const [formUsername, setFormUsername] = useState("nttbell");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchSystemSettings();
      setData(res);
      setCurrentUsername(res.admin.username);
      setFormUsername(res.admin.username);

      if (res.settings) {
        setLimits({
          max_pages_per_audit: Number(
            res.settings.max_pages_per_audit?.value || 10,
          ),
          request_timeout_seconds: Number(
            res.settings.request_timeout_seconds?.value || 8,
          ),
          max_response_size_kb: Number(
            res.settings.max_response_size_kb?.value || 2048,
          ),
          max_redirects: Number(res.settings.max_redirects?.value || 3),
          max_concurrent_audits: Number(
            res.settings.max_concurrent_audits?.value || 2,
          ),
          audit_retention_days: Number(
            res.settings.audit_retention_days?.value || 7,
          ),
          log_retention_days: Number(
            res.settings.log_retention_days?.value || 30,
          ),
          error_retention_days: Number(
            res.settings.error_retention_days?.value || 30,
          ),
        });
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load system settings",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await loadSettings();
    };
    fetchData();
  }, []);

  const handleSaveLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await updateSystemSettings(limits);
      Swal.fire({
        icon: "success",
        title: "Settings Saved!",
        text: "Audit execution limits and data retention updated successfully.",
        confirmButtonColor: "#2563eb",
      });
    } catch (err: unknown) {
      showFailureAlert(err instanceof ApiRequestError ? err.failure : undefined);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      Swal.fire({
        icon: "warning",
        title: "Verification Required",
        text: "Current password is required to authorize credential changes.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    if (!formUsername.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Username",
        text: "Username cannot be empty.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    if (newPassword && newPassword.length < 8) {
      Swal.fire({
        icon: "warning",
        title: "Password Too Short",
        text: "New password must be at least 8 characters.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      Swal.fire({
        icon: "error",
        title: "Password Mismatch",
        text: "New password confirmation does not match.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const res = await updateAdminProfile(
        currentPassword,
        formUsername.trim(),
        newPassword || undefined,
      );

      if (res.success) {
        if (res.user?.username) {
          setCurrentUsername(res.user.username);
          setFormUsername(res.user.username);
        }
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        Swal.fire({
          icon: "success",
          title: "Credentials Updated!",
          text: "New username and password saved to users table.",
          confirmButtonColor: "#2563eb",
        });
      } else {
        showFailureAlert(res.failure);
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "Network Error",
        text: "A connection error occurred while updating credentials.",
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  if (isLoading && !data) {
    return (
      <LoadingState
        message="Loading system configuration parameters..."
        className="min-h-[400px]"
      />
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to Load Settings"
        description={error || "Unable to load configuration from database."}
        onRetry={loadSettings}
      />
    );
  }

  const { app_info } = data;

  return (
    <div className="space-y-6">
      {/* A. Administrator Account & Credentials */}
      <Card>
        <CardHeader className="border-b border-[var(--color-border-subtle)] pb-3 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-[var(--color-brand-primary)]" />
              <CardTitle className="text-sm font-semibold">
                Administrator Account & Credential Security
              </CardTitle>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Update administrator login username or password stored in the{" "}
              <code className="px-1 py-0.5 rounded bg-[var(--color-surface-secondary)]  text-[11px]">
                users
              </code>{" "}
              table.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-xs  text-[var(--color-text-secondary)]">
            <User className="size-3.5 text-[var(--color-text-muted)]" />
            <span>
              Active:{" "}
              <strong className="text-[var(--color-text-primary)]">
                {currentUsername}
              </strong>
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Current Password (Required)"
                  type="password"
                  placeholder="Enter current password for verification"
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
                  Unique identity for login authentication.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[var(--color-border-subtle)]">
              <div>
                <Input
                  label="New Password (Optional)"
                  type="password"
                  placeholder="Leave blank if you do not wish to change password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  leftIcon={<LockKeyhole className="size-4" />}
                />
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                  Minimum 8 characters combining letters, numbers, and symbols.
                </p>
              </div>

              <div>
                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Retype new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  leftIcon={<LockKeyhole className="size-4" />}
                  disabled={!newPassword}
                />
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                  Must match new password above exactly.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={isUpdatingProfile || !currentPassword}
                leftIcon={
                  isUpdatingProfile ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )
                }
              >
                {isUpdatingProfile
                  ? "Saving..."
                  : "Save Credential Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* C. Audit Execution Limits & Retention Settings */}
      <Card>
        <CardHeader className="border-b border-[var(--color-border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-[var(--color-brand-primary)]" />
            <CardTitle className="text-sm font-semibold">
              Audit Operational Limits & Data Retention
            </CardTitle>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Inspection engine security limits to prevent resource overload and retention rules.
          </p>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={handleSaveLimits} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Input
                  label="Max Pages per Audit"
                  type="number"
                  min={1}
                  max={50}
                  value={limits.max_pages_per_audit}
                  onChange={(e) =>
                    setLimits({
                      ...limits,
                      max_pages_per_audit: Number(e.target.value),
                    })
                  }
                  hint="Safe range: 1–50 pages"
                />
              </div>

              <div>
                <Input
                  label="Request Timeout (Seconds)"
                  type="number"
                  min={2}
                  max={30}
                  value={limits.request_timeout_seconds}
                  onChange={(e) =>
                    setLimits({
                      ...limits,
                      request_timeout_seconds: Number(e.target.value),
                    })
                  }
                  hint="Safe range: 2–30 seconds"
                />
              </div>

              <div>
                <Input
                  label="Max Document Size (KB)"
                  type="number"
                  min={512}
                  max={10240}
                  value={limits.max_response_size_kb}
                  onChange={(e) =>
                    setLimits({
                      ...limits,
                      max_response_size_kb: Number(e.target.value),
                    })
                  }
                  hint="Safe range: 512–10240 KB"
                />
              </div>

              <div>
                <Input
                  label="Max Redirect Hops"
                  type="number"
                  min={1}
                  max={5}
                  value={limits.max_redirects}
                  onChange={(e) =>
                    setLimits({
                      ...limits,
                      max_redirects: Number(e.target.value),
                    })
                  }
                  hint="Safe range: 1–5 redirects"
                />
              </div>

              <div>
                <Input
                  label="Concurrent Audits per IP"
                  type="number"
                  min={1}
                  max={10}
                  value={limits.max_concurrent_audits}
                  onChange={(e) =>
                    setLimits({
                      ...limits,
                      max_concurrent_audits: Number(e.target.value),
                    })
                  }
                  hint="Safe range: 1–10 jobs"
                />
              </div>

              <div>
                <Input
                  label="Public Audit Retention (Days)"
                  type="number"
                  min={1}
                  max={90}
                  value={limits.audit_retention_days}
                  onChange={(e) =>
                    setLimits({
                      ...limits,
                      audit_retention_days: Number(e.target.value),
                    })
                  }
                  hint="Automatic purge of temporary data"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-[var(--color-border-subtle)]">
              <Button
                type="submit"
                variant="primary"
                disabled={isSavingSettings}
                leftIcon={
                  isSavingSettings ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )
                }
              >
                {isSavingSettings
                  ? "Saving Limits..."
                  : "Save Operational Limits"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* F. Application Information */}
      <Card>
        <CardHeader className="border-b border-[var(--color-border-subtle)] pb-3">
          <CardTitle className="text-sm font-semibold">
            Application Environment Information
          </CardTitle>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Platform metadata and server runtime without exposing secret environment variables.
          </p>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs ">
          <div className="space-y-1">
            <span className="text-[var(--color-text-muted)]">Application</span>
            <div className="font-bold text-[var(--color-text-primary)]">
              {app_info.name}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[var(--color-text-muted)]">Version</span>
            <div className="font-bold text-[var(--color-text-primary)]">
              {app_info.version}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[var(--color-text-muted)]">PHP Engine</span>
            <div className="font-bold text-[var(--color-text-primary)]">
              {app_info.php_version}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[var(--color-text-muted)]">Database</span>
            <div className="font-bold text-[var(--color-text-primary)]">
              {app_info.database_engine}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
