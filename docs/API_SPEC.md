# API Specification (draft)

All routes and response shapes are proposals until implemented and tested.

## Public
- `POST /api/v1/audits` — validate target URL and request a bounded audit.
- `GET /api/v1/audits/{id}` — retrieve permitted status for the caller's report.
- `GET /api/v1/audits/{id}/report` — retrieve the report only with valid report authorization.
- `GET /api/v1/audits/{id}/export.json` — export authorized report.
- `GET /api/v1/health` — minimal health response; no secrets or internal details.

## Administrator-only
- `GET /api/v1/admin/overview` — aggregate overview.
- `GET /api/v1/admin/traffic` — aggregate traffic statistics.
- `GET /api/v1/admin/audit-stats` — aggregate module/status counts.
- `GET /api/v1/admin/system-health` — dependency/service health.
- `GET /api/v1/admin/errors` — sanitized, grouped operational errors.

## Explicitly prohibited
- No endpoint for administrators to browse individual reports or retrieve raw user-submitted URLs.
- No public error endpoint that accepts arbitrary stack traces or unlimited payloads.
- Never trust an audit ID alone as authorization to view a report.
