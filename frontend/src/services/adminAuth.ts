import { readJsonSafe, toApiFailure, type ApiFailure } from "./apiError";

export interface AdminUser {
  id: number;
  username: string;
  role: string;
}

export interface LoginResult {
  success: boolean;
  user?: AdminUser;
  error?: string;
  failure?: ApiFailure;
}

export interface SessionResult {
  authenticated: boolean;
  user?: AdminUser;
  rate_limited?: boolean;
  lockout_remaining_seconds?: number;
}

const API_BASE = "/api";

/**
 * Perform administrator login via server-side API with anti-bot honeypot
 */
export async function loginAdmin(
  username: string,
  password: string,
  honeypot = ""
): Promise<LoginResult> {
  try {
    const res = await fetch(`${API_BASE}/auth/login.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Send and receive secure cookies
      body: JSON.stringify({
        username,
        password,
        honeypot,
      }),
    });

    const data = await readJsonSafe(res) as Record<string, unknown> | null;

    if (!res.ok || !data?.success) {
      return {
        success: false,
        error: typeof data?.error === "string" ? data.error : "Authentication failed. Access restricted.",
        failure: toApiFailure(res, data),
      };
    }

    return {
      success: true,
      user: data.user as AdminUser,
    };
  } catch {
    return {
      success: false,
      error: "Unable to reach security gateway. Please verify network.",
    };
  }
}

/**
 * Verify active administrator session from the server (source of truth)
 */
export async function verifyAdminSession(): Promise<SessionResult> {
  try {
    const res = await fetch(`${API_BASE}/auth/session.php`, {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache",
      },
      credentials: "include",
    });

    if (!res.ok) {
      return { authenticated: false };
    }

    const data = await res.json();
    return {
      authenticated: Boolean(data.authenticated),
      user: data.user,
      rate_limited: Boolean(data.rate_limited),
      lockout_remaining_seconds: typeof data.lockout_remaining_seconds === "number" ? data.lockout_remaining_seconds : 0,
    };
  } catch {
    return { authenticated: false };
  }
}

/**
 * Revoke active administrator session on the server and remove cookie
 */
export async function logoutAdmin(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/logout.php`, {
      method: "POST",
      credentials: "include",
    });

    return res.ok;
  } catch {
    return false;
  }
}

export interface UpdateProfileResult {
  success: boolean;
  message?: string;
  user?: AdminUser;
  error?: string;
  failure?: ApiFailure;
}

/**
 * Update administrator username and/or password with current password verification
 */
export async function updateAdminProfile(
  currentPassword: string,
  newUsername: string,
  newPassword?: string
): Promise<UpdateProfileResult> {
  try {
    const res = await fetch(`${API_BASE}/admin/update-profile.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        current_password: currentPassword,
        new_username: newUsername,
        new_password: newPassword || undefined,
      }),
    });

    const data = await readJsonSafe(res) as Record<string, unknown> | null;
    if (!res.ok || !data?.success) {
      return {
        success: false,
        error: typeof data?.error === "string" ? data.error : "Failed to update profile credentials.",
        failure: toApiFailure(res, data),
      };
    }

    return {
      success: true,
      message: typeof data.message === "string" ? data.message : "Profile credentials updated successfully.",
      user: data.user as AdminUser,
    };
  } catch {
    return {
      success: false,
      error: "Unable to reach server. Please check your connection.",
    };
  }
}

