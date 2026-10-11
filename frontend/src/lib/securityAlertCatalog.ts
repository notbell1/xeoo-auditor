/**
 * Security alert catalog (pure, dependency-free so it can be unit-tested with `node --test`).
 *
 * Rules:
 * - The category is chosen ONLY from a structured backend `code` (or HTTP status), never from text sniffing.
 * - Messages are static strings. User input / payloads are never interpolated into them.
 * - A validation error is never labelled an attack. SUSPICIOUS_INPUT is reserved for an explicit
 *   backend signal and is not emitted by any current endpoint.
 */

export type SecurityAlertCategory =
  | "INVALID_INPUT"
  | "SUSPICIOUS_INPUT"
  | "SECURITY_BLOCKED"
  | "RATE_LIMITED"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "SERVER_ERROR";

export type SecurityAlertSeverity = "info" | "warning" | "critical";

export interface CategoryMeta {
  title: string;
  severity: SecurityAlertSeverity;
}

export const CATEGORY_META: Record<SecurityAlertCategory, CategoryMeta> = {
  INVALID_INPUT: { title: "Input rejected", severity: "info" },
  SUSPICIOUS_INPUT: { title: "Suspicious input flagged", severity: "warning" },
  SECURITY_BLOCKED: { title: "Request blocked", severity: "critical" },
  RATE_LIMITED: { title: "Slow down", severity: "warning" },
  UNAUTHENTICATED: { title: "Access denied", severity: "warning" },
  FORBIDDEN: { title: "Not permitted", severity: "critical" },
  SERVER_ERROR: { title: "System fault", severity: "warning" },
};

/** Neutral copy used when a category is unknown. Deliberately free of drama. */
export const FALLBACK_MESSAGE = "Something went wrong with that request. Please check your input and try again.";
export const FALLBACK_TITLE = "Request failed";

export const ALERT_MESSAGES: Record<SecurityAlertCategory, readonly string[]> = {
  INVALID_INPUT: [
    "That input doesn't fit the shape we expected. Unlike some promises, ours have a format.",
    "We read it twice. Still not valid. Some things don't improve with a second look.",
    "This field wanted something specific. It's not you, it's the schema.",
    "Close, but not quite. Like most things worth having, it needs to be exact.",
    "The form rejected this value. It has standards. You should, too.",
    "That value didn't make it past validation. Not everything gets a second chance.",
    "Check the format and try again. Trust is easier to rebuild than a malformed request.",
    "We're not angry, just disappointed in that field. Correct it and move on.",
  ],
  SUSPICIOUS_INPUT: [
    "That input looked like it came with intentions. We handled it as plain data and moved on.",
    "Interesting characters. We stored nothing, trusted nothing, and rendered it harmless.",
    "That pattern has a history. We treated it as text and kept our guard up.",
    "Nice try at sounding clever. Here it is only a string, and strings don't get access.",
    "We noticed the pattern. Nothing ran, nothing leaked, and the log has a polite note.",
    "That looked rehearsed. Sadly for the script, we don't fall for lines like that.",
    "Unusual input, handled quietly. We keep our feelings and our queries parameterized.",
    "Whatever that was meant to do, it didn't. We only deal in data here.",
  ],
  SECURITY_BLOCKED: [
    "Request denied. Some doors close for good reason, and this is one of them.",
    "Blocked by a policy that was never going to change its mind.",
    "We can't let that through. Boundaries are a feature, not a bug.",
    "Access to that destination is closed. It wasn't personal, it was policy.",
    "This request crossed a line we drew a long time ago. Nothing was sent.",
    "Blocked. We learned long ago that not everyone should get to walk in.",
    "That path is sealed. The protection worked exactly as intended.",
    "Denied, quietly and completely. Trust is earned, and this request hasn't earned it.",
  ],
  RATE_LIMITED: [
    "Too many requests, too fast. Even the best connections need room to breathe.",
    "You're moving faster than we can respond. Give it a moment. Some things can't be rushed.",
    "Easy there. Constant contact is how every relationship ends, so wait a little.",
    "Rate limit reached. We love the enthusiasm, not the frequency.",
    "Patience is a security control too. Try again shortly.",
    "We need a little space. Please wait before asking again.",
    "That's a lot of knocking. Come back when the silence has had time to settle.",
    "Slow down. Not every request needs an answer this instant.",
  ],
  UNAUTHENTICATED: [
    "We don't know you. Credentials, please. Strangers don't get the keys.",
    "Access denied. Those credentials didn't convince us. Trust is hard to earn back.",
    "Identity unconfirmed. We say it gently: we can't let you in.",
    "Your session ended, or it never existed. Either way, sign in again.",
    "Those details don't match. We can't tell you which part was wrong. Old habits.",
    "Without proof of who you are, this door stays shut.",
    "Not signed in. The dashboard is waiting, but it needs more than good intentions.",
    "The login didn't work out. Check the details before trying again.",
  ],
  FORBIDDEN: [
    "You're signed in, but not allowed here. Some places stay off-limits.",
    "Permission denied. Being recognized and being welcome are two different things.",
    "That request came from somewhere we don't accept. Please use the app directly.",
    "Access refused. The answer was no before the question was finished.",
    "This action isn't yours to take. Boundaries exist for a reason.",
    "Forbidden. We've seen where this road leads, so we closed it.",
    "Not permitted. Even trust has limits, and this is one of them.",
    "The origin of that request wasn't recognized. We prefer familiar faces.",
  ],
  SERVER_ERROR: [
    "Something broke on our side. We'd blame you, but this one's on us.",
    "An internal fault occurred. Nothing leaked, only our pride took the damage.",
    "We hit an unexpected error. Details stay private; the logs got the full story.",
    "The system stumbled. We're calmly pretending everything is fine. Try again shortly.",
    "Internal error. The details are filed away, and a request reference is attached below.",
    "Our side failed. It happens to every system eventually. Please retry in a moment.",
    "Unexpected failure. Nothing sensitive was shown, and nothing was lost but time.",
    "That one's on us. Wait a moment and try again.",
  ],
};

/** Stable backend `code` -> alert category. Anything not listed falls back to a neutral alert. */
export const BACKEND_CODE_TO_CATEGORY: Readonly<Record<string, SecurityAlertCategory>> = {
  INVALID_INPUT: "INVALID_INPUT",
  INVALID_TARGET: "INVALID_INPUT",
  UNSUPPORTED_MEDIA_TYPE: "INVALID_INPUT",
  REQUEST_TOO_LARGE: "INVALID_INPUT",
  CONFLICT: "INVALID_INPUT",
  SUSPICIOUS_INPUT: "SUSPICIOUS_INPUT",
  SECURITY_BLOCKED: "SECURITY_BLOCKED",
  RATE_LIMITED: "RATE_LIMITED",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  INVALID_CREDENTIALS: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  INTERNAL_ERROR: "SERVER_ERROR",
};

export function isKnownCategory(value: unknown): value is SecurityAlertCategory {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(CATEGORY_META, value);
}

/** Resolve a category from a structured backend code only. Returns null when unknown. */
export function categoryFromCode(code: unknown): SecurityAlertCategory | null {
  if (typeof code !== "string") return null;
  return Object.prototype.hasOwnProperty.call(BACKEND_CODE_TO_CATEGORY, code) ? BACKEND_CODE_TO_CATEGORY[code] : null;
}

/** Coarse fallback from HTTP status when no structured code is available. */
export function categoryFromStatus(status: number | undefined): SecurityAlertCategory | null {
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "FORBIDDEN";
  if (status === 429) return "RATE_LIMITED";
  if (status === 413 || status === 415) return "INVALID_INPUT";
  if (typeof status === "number" && status >= 500 && status <= 599) return "SERVER_ERROR";
  return null;
}

export interface AlertContent {
  category: SecurityAlertCategory | null;
  title: string;
  message: string;
  severity: SecurityAlertSeverity;
}

/**
 * Picks messages at random but never returns the same message twice in a row
 * (across all categories). Inject `random` for deterministic tests.
 */
export function createMessagePicker(random: () => number = Math.random) {
  let lastMessage: string | null = null;

  return function pick(category: SecurityAlertCategory | null): AlertContent {
    if (category === null || !isKnownCategory(category)) {
      return { category: null, title: FALLBACK_TITLE, message: FALLBACK_MESSAGE, severity: "info" };
    }
    const pool = ALERT_MESSAGES[category];
    const candidates = pool.filter((m) => m !== lastMessage);
    const choice = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
    lastMessage = choice;
    const meta = CATEGORY_META[category];
    return { category, title: meta.title, message: choice, severity: meta.severity };
  };
}

/** Suppresses identical alerts fired within the cooldown window (dedup + flood control). */
export function createAlertGate(now: () => number = Date.now, cooldownMs = 4000) {
  const lastShown = new Map<string, number>();

  return function shouldShow(key: string): boolean {
    const t = now();
    const previous = lastShown.get(key);
    if (previous !== undefined && t - previous < cooldownMs) return false;
    lastShown.set(key, t);
    if (lastShown.size > 50) {
      for (const [k, ts] of lastShown) if (t - ts >= cooldownMs) lastShown.delete(k);
    }
    return true;
  };
}

