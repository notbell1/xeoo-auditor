import React, { useState, useEffect } from "react";
import {
  LockKeyhole,
  User,
  ArrowRight,
  AlertCircle,
  Loader2,
  Clock3,
} from "lucide-react";
import Swal from "sweetalert2";
import { useNavigate } from "../../app/router-context";
import { Button, Input } from "../../components/common";
import { loginAdmin, verifyAdminSession } from "../../services/adminAuth";
import { showFailureAlert, showSecurityAlert } from "../../lib/securityAlert";

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Anti-bot honeypot field
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // If administrator already has a valid session, redirect directly to dashboard.
  // Also synchronize any active IP/account rate-limit lockout from backend source of truth.
  useEffect(() => {
    let isMounted = true;
    verifyAdminSession().then((res) => {
      if (isMounted) {
        if (res.authenticated) {
          navigate("/mimin/dashboard", { replace: true });
        } else {
          if (res.rate_limited && res.lockout_remaining_seconds && res.lockout_remaining_seconds > 0) {
            setLockoutRemaining(res.lockout_remaining_seconds);
          }
          setIsCheckingSession(false);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  // Live countdown timer: decrements every second until cooldown expires
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const interval = setInterval(() => {
      setLockoutRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutRemaining]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Anti-bot detection: if hidden honeypot field was filled, silently drop
    if (honeypot.trim().length > 0) {
      setError("Request rejected by security gate.");
      showSecurityAlert({ code: "SECURITY_BLOCKED" });
      return;
    }

    if (!username.trim() || !password.trim()) {
      const msg = "Please enter both username and password to continue.";
      setError(msg);
      Swal.fire({
        icon: "warning",
        title: "Incomplete Form",
        text: msg,
        confirmButtonColor: "#2563eb",
        confirmButtonText: "Understood",
        background: "#0f172a",
        color: "#f8fafc",
        customClass: {
          popup: "border border-slate-800 rounded-2xl shadow-2xl",
        },
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await loginAdmin(username.trim(), password, honeypot);
      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "Login Successful!",
          text: `Welcome back, ${res.user?.username || username}! Redirecting to dashboard...`,
          timer: 1600,
          timerProgressBar: true,
          showConfirmButton: false,
          background: "#0f172a",
          color: "#f8fafc",
          customClass: {
            popup: "border border-slate-800 rounded-2xl shadow-2xl",
          },
        });
        navigate("/mimin/dashboard", { replace: true });
      } else {
        const errorMsg =
          res.error || "Invalid username or password. Access denied.";
        setError(errorMsg);
        if (res.failure?.code === "RATE_LIMITED" && res.failure.retryAfter) {
          setLockoutRemaining(res.failure.retryAfter);
        }
        showFailureAlert(res.failure);
      }
    } catch {
      const netMsg =
        "Unable to connect to authentication server. Check backend connection.";
      setError(netMsg);
      Swal.fire({
        icon: "error",
        title: "Connection Failed!",
        text: netMsg,
        confirmButtonColor: "#2563eb",
        confirmButtonText: "Close",
        background: "#0f172a",
        color: "#f8fafc",
        customClass: {
          popup: "border border-slate-800 rounded-2xl shadow-2xl",
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatLockoutTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="size-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const isLocked = lockoutRemaining > 0;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Background ambient gradient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="w-full max-w-sm relative z-10 space-y-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Admin Login
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Restricted management portal for authorized operators only.
                </p>
              </div>
            </div>

            {isLocked && (
              <div
                role="alert"
                className="flex items-center gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs"
              >
                <Clock3 className="size-4 shrink-0 text-amber-400" />
                <div className="flex-1">
                  <span className="font-semibold">Login locked:</span> Too many attempts. Please wait{" "}
                  <span className="font-mono font-bold text-amber-200">
                    {formatLockoutTime(lockoutRemaining)}
                  </span>{" "}
                  before retrying.
                </div>
              </div>
            )}

            {error && !isLocked && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Anti-bot honeypot input (invisible to humans) */}
            <div aria-hidden="true" className="hidden">
              <label htmlFor="website_sec_trap">Leave blank</label>
              <input
                id="website_sec_trap"
                type="text"
                name="website_sec_trap"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="admin_username"
                className="block text-xs font-medium text-slate-300"
              >
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                <Input
                  id="admin_username"
                  type="text"
                  autoComplete="username"
                  required
                  disabled={isLoading || isLocked}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="pl-9 bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="admin_password"
                className="block text-xs font-medium text-slate-300"
              >
                Password
              </label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                <Input
                  id="admin_password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={isLoading || isLocked}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="pl-9 bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              disabled={isLocked}
              rightIcon={
                isLocked ? (
                  <Clock3 className="size-4" />
                ) : (
                  <ArrowRight className="size-4" />
                )
              }
              className="w-full justify-center mt-2 bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLocked
                ? `Locked (${formatLockoutTime(lockoutRemaining)})`
                : "Login"}
            </Button>
            <p className="text-[11px] text-center text-slate-500">
              XeooAuditor Security Gateway &bull; Anti-bot monitoring active
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
