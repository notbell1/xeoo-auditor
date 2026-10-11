# Security Policy

## Reporting
Do not include secrets, credentials, cookies, personal data, or private target URLs in bug reports. Use a sanitized reproduction and a request ID where possible.

## Security design baseline
- Strict URL validation and SSRF defenses before any outbound request.
- Block loopback, private, link-local, reserved, and metadata destinations, including redirects and DNS-resolved addresses.
- Enforce rate limits, request timeouts, response-size limits, crawl limits, and safe concurrency.
- Never disable TLS verification.
- Keep secrets server-side; redact sensitive data from logs and dashboard output.
- Use least-privilege database credentials and prepared statements.
- Do not expose raw stack traces or internal errors to visitors.
- Only test systems you own or are authorized to assess.

This file is a baseline, not a claim that the application has already implemented these controls.
