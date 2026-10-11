import Swal from "sweetalert2";
import {
  categoryFromCode,
  categoryFromStatus,
  createAlertGate,
  createMessagePicker,
  type SecurityAlertSeverity,
} from "./securityAlertCatalog";
import type { ApiFailure } from "../services/apiError";

const pickMessage = createMessagePicker();
const shouldShow = createAlertGate();

const ACCENT: Record<SecurityAlertSeverity, { color: string; icon: "info" | "warning" | "error" }> = {
  info: { color: "var(--cyan-600)", icon: "info" },
  warning: { color: "var(--amber-500)", icon: "warning" },
  critical: { color: "var(--ruby-600)", icon: "error" },
};

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Plain-text detail line: only backend-authored safe text, a retry hint and the request reference. */
function buildDetail(failure: ApiFailure): string {
  const parts: string[] = [];
  if (failure.message) parts.push(failure.message);
  if (failure.retryAfter && failure.retryAfter > 0) parts.push(`Try again in about ${failure.retryAfter}s.`);
  if (failure.requestId) parts.push(`Ref: ${failure.requestId}`);
  return parts.join("\n");
}

/**
 * Show a dark, accessible alert for an API failure. Category selection uses the structured code
 * (then the HTTP status) only. Identical alerts inside the cooldown window are suppressed.
 */
export function showSecurityAlert(failure: ApiFailure): void {
  const category = categoryFromCode(failure.code) ?? categoryFromStatus(failure.status);
  const key = `${failure.code ?? failure.status ?? "unknown"}:${category ?? "fallback"}`;
  if (!shouldShow(key)) return;

  const content = pickMessage(category);
  const accent = ACCENT[content.severity];
  const detail = buildDetail(failure);
  const motion = prefersReducedMotion() ? { popup: "" } : undefined;

  void Swal.fire({
    icon: accent.icon,
    iconColor: accent.color,
    title: content.title,
    text: content.message, // `text` (never `html`): rendered as plain text
    footer: detail ? `<pre class="xeoo-alert-detail"></pre>` : undefined,
    didOpen: (popup) => {
      const pre = popup.querySelector<HTMLElement>(".xeoo-alert-detail");
      if (pre) pre.textContent = detail; // textContent keeps backend text inert
    },
    confirmButtonText: "Understood",
    confirmButtonColor: "var(--blue-600)",
    background: "var(--slate-900)",
    color: "var(--slate-50)",
    showClass: motion,
    hideClass: motion,
    customClass: {
      popup: "border rounded-2xl shadow-2xl",
      title: "text-lg",
      footer: "xeoo-alert-footer",
    },
    didRender: (popup) => {
      popup.style.borderColor = accent.color;
      popup.setAttribute("aria-live", "assertive");
    },
  });
}

/** Neutral alert for a network failure (no response at all). */
export function showConnectionAlert(): void {
  if (!shouldShow("network")) return;
  void Swal.fire({
    icon: "warning",
    iconColor: "var(--amber-500)",
    title: "Connection lost",
    text: "We couldn't reach the server. Check your connection and try again.",
    confirmButtonText: "Understood",
    confirmButtonColor: "var(--blue-600)",
    background: "var(--slate-900)",
    color: "var(--slate-50)",
    customClass: { popup: "border border-slate-800 rounded-2xl shadow-2xl" },
  });
}

/** Show the right alert for a failed API call: structured failure, or a connection alert if no response arrived. */
export function showFailureAlert(failure?: ApiFailure): void {
  if (failure) showSecurityAlert(failure);
  else showConnectionAlert();
}
