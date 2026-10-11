# Roadmap

## Phase 0 — Verify environment
- Confirm local toolchain.
- Confirm Wuaze PHP/runtime, database, outbound request, HTTPS, limits, and worker/cron capabilities.
- Record constraints before committing to architecture.

## Phase 1 — Foundation
- Create frontend and backend skeletons.
- Add configuration templates, health endpoint, consistent API errors, and request IDs.
- Establish lint/type-check/test/build commands.

## Phase 2 — Secure MVP checks
- Sitemap.xml, robots.txt, internal links, canonical URL, broken links, favicon, HTTPS/SSL.
- Enforce SSRF defenses, timeouts, redirect limits, response-size/page limits, and rate limiting.
- Return PASS/FAIL/WARNING/NOT_CHECKED/MANUAL_REQUIRED with evidence.

## Phase 3 — Reports and remaining modules
- Add breadcrumbs, schema checks, indexing guidance, form/CTA/WhatsApp checks, and responsive checks where technically possible.
- Use MANUAL_REQUIRED or CONNECT_REQUIRED where access or instrumentation is needed.

## Phase 4 — Error monitoring
- Frontend error boundary and global exception capture.
- Backend exception handler and structured sanitized logging.
- Error grouping, occurrence counts, status workflow, and runbook guidance.
- Admin dashboard for aggregate/sanitized operational information only.

## Phase 5 — QA and deployment
- Security regression tests, privacy tests, responsive checks, and deployment smoke tests.
- Verify retention/cleanup and monitoring failure behavior.
