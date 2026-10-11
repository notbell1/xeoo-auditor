/** Structured failure info carried from the API layer. Never contains request payloads. */
export interface ApiFailure {
  /** Stable backend error code, e.g. INVALID_INPUT, RATE_LIMITED. */
  code?: string;
  status?: number;
  /** Safe, backend-authored message (plain text). */
  message?: string;
  requestId?: string;
  retryAfter?: number;
}

function asString(value: unknown, max: number): string | undefined {
  return typeof value === "string" && value.length > 0 ? value.slice(0, max) : undefined;
}

/** Build an ApiFailure from an HTTP response and its (untrusted) JSON body. */
export function toApiFailure(res: Response, data: unknown): ApiFailure {
  const body = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>;
  const retryAfter = Number(body.retry_after ?? res.headers.get("Retry-After"));
  return {
    status: res.status,
    code: asString(body.code, 48),
    message: asString(body.error, 300),
    requestId: asString(body.request_id, 32),
    retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(Math.round(retryAfter), 86400) : undefined,
  };
}

/** Parse a JSON body without throwing (non-JSON error pages must not crash callers). */
export async function readJsonSafe(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** Error thrown by API helpers; carries the structured failure for alert selection. */
export class ApiRequestError extends Error {
  readonly failure: ApiFailure;

  constructor(message: string, failure: ApiFailure) {
    super(message);
    this.name = "ApiRequestError";
    this.failure = failure;
  }
}

/** Throw an ApiRequestError (with structured failure) when the response is not OK. */
export async function assertOk(res: Response, fallbackMessage: string): Promise<void> {
  if (res.ok) return;
  const failure = toApiFailure(res, await readJsonSafe(res));
  throw new ApiRequestError(failure.message ?? fallbackMessage, failure);
}
