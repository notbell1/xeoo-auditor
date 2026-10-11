# Privacy Model

## Public visitors
- No account required for the planned public audit flow.
- The report should be accessible only to the person holding a secure, unguessable report reference/token.
- Tell visitors what is processed, what is retained, and when temporary results expire.

## Administrator dashboard
The dashboard is limited to aggregate traffic/audit metrics, system health, and sanitized grouped errors. It must not provide a browse/search interface for individual user reports or raw submitted target URLs.

## Logging
Never log passwords, cookies, auth headers, tokens, form contents, full target URLs, or raw target-site response bodies. Sanitize frontend messages and stack traces before transmission. Store only what is needed for diagnosis.

## Honest limitations
Dashboard access restrictions reduce exposure but do not make data technically inaccessible to a fully privileged server/database operator. Avoid absolute privacy guarantees.
