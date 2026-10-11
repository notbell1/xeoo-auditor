# Database Schema (draft)

Schema is conceptual only; do not run migrations until retention, report access, and hosting are confirmed.

Potential tables:
- `admins`: administrator account identifiers and password hashes; no plaintext passwords.
- `audit_jobs`: minimal processing metadata, status, timestamps, expiry.
- `audit_results`: findings associated with a protected report reference; apply expiry/retention.
- `analytics_daily`: aggregated counts only.
- `error_events`: sanitized operational event records with restricted retention.
- `error_groups`: normalized fingerprints, severity, status, count, first/last seen.
- `error_occurrences_daily`: daily aggregate occurrence counts.
- `error_runbooks`: reviewed mitigation instructions.
- `admin_activity_logs`: record privileged actions without including secrets or report contents.

Privacy rules:
- Avoid full IP addresses, full target URLs, cookies, tokens, credentials, raw request bodies, and form contents in logs.
- Restrict DB users by permission and separate runtime credentials where practical.
- Set and test a documented cleanup/retention process.
