# Architecture (proposed)

## Request flow
Public browser → frontend → API validation and rate limiting → bounded audit engine → normalized findings → report response.

Operational events → sanitization/redaction → error grouping/aggregation → Administrator dashboard.

## Boundaries
- Public report access should use an unguessable, short-lived report token or equivalent authorization mechanism.
- Admin endpoints return only aggregate statistics, service health, and sanitized error groups.
- Do not implement an admin endpoint for viewing arbitrary individual reports.
- Keep the audit engine isolated from dashboard/analytics functionality.
- If hosting cannot safely support long-running audits, use a bounded synchronous MVP or a separate worker later; do not assume queues are available.

## Hosting validation checklist
- PHP version and required extensions (`curl`, `json`, `dom`, `libxml`, `openssl`, `pdo_mysql` as needed)
- MySQL/MariaDB availability and connection limits
- Outbound HTTP access and TLS behavior
- HTTPS certificate and deployment rules
- Maximum execution time, memory, request body size, and process limits
- Cron jobs, background workers, shell access, and Node.js runtime availability
