# Security Notes (Practical Demo Hardening)

This project applies practical security hardening for thesis/demo use, not enterprise-grade controls.

## Included
- DTO validation with `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`)
- JWT auth with access/refresh tokens and hashed refresh-token storage
- Basic login/refresh rate limiting
- Helmet security headers
- CORS whitelist
- Safe global error responses (no raw stack/DB internals to client)
- Sensitive log redaction
- Prisma ORM usage (no unsafe raw SQL methods)
- Payment callback verification via provider-signature flow

## XSS
- Backend treats user-provided text as untrusted.
- Frontend renders text normally (React escapes by default).
- Avoid `dangerouslySetInnerHTML` unless explicitly sanitized.

## Known limitations
- In-memory throttling (single instance)
- No WAF/SIEM
- No advanced secret rotation
- No enterprise audit/compliance framework
- No Prometheus/Grafana/OpenTelemetry stack
