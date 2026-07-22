# Security Notes — CarParts Kurdistan

Last hardening pass: 2026-07-18. This summarizes what is handled in the code,
what is deliberately deferred, and what must be done manually before going live.

## Handled in code

- **Authentication & sessions** — JWT (HS256, `jose`) in an `httpOnly`,
  `sameSite=lax` cookie; `secure` flag is enabled automatically in production
  (`NODE_ENV=production`). Sessions expire after 30 days. Passwords hashed with
  bcrypt (cost 10). `JWT_SECRET` lives only in `.env` (never in code).
- **Admin authorization** — three layers: `src/proxy.ts` verifies the JWT role
  before any `/admin` route renders (App Router layouts render in parallel with
  pages, so the layout check alone is not a boundary), the admin layout
  re-checks, and every one of the 16 admin server actions calls
  `requireAdmin()` server-side. Customer actions verify record ownership
  (`customerId` match) before any mutation.
- **Rate limiting** (`src/lib/rate-limit.ts`) — fixed-window, keyed by IP and
  identifier: login 5/15min per email + 10/15min per IP; OTP issue 5/h per
  phone + 10/h per IP (plus a 60s resend cooldown and 5-minute code expiry);
  OTP verify 10/15min per phone + 20/15min per IP (plus a hard 5-wrong-attempt
  limit per code stored in the DB, and codes are single-use); part request
  submission 10/h per customer. **In-memory — single-process only.** If the
  app is scaled to multiple instances/serverless, move the buckets to Redis.
- **Uploads** (`src/lib/storage.ts`) — file type detected from magic bytes
  (JPEG/PNG/WEBP/HEIC); the browser MIME type and filename are ignored, so
  renamed executables and spoofed Content-Types are rejected. Stored names are
  server-generated UUIDs — client filenames never touch the path (no
  traversal). 5 MB cap. `X-Content-Type-Options: nosniff` is set globally.
- **CSRF** — Next.js server actions only accept POSTs whose `Origin` matches
  the request `Host` (verified by test: a forged cross-site Origin returns
  500 "Invalid Server Actions request" and the action never runs). The session
  cookie's `sameSite=lax` blocks the cookie from being sent on cross-site
  POSTs as a second layer. There are no custom API route handlers.
- **Injection** — all database access goes through Prisma's parameterized
  client (no raw SQL anywhere); no shell commands touch user input; file paths
  are server-generated (see uploads). User-supplied text (notes, color codes,
  names) is rendered through React's default escaping — no
  `dangerouslySetInnerHTML` in the codebase.
- **IDs in redirects** — request IDs coming from form data are validated
  against a cuid pattern before being interpolated into redirect URLs.
- **Security headers** (`next.config.ts`) — CSP (`default-src 'self'`,
  `frame-ancestors 'none'`, `object-src 'none'`; `unsafe-inline` script-src is
  required by Next's hydration bootstrap, `unsafe-eval` is dev-only),
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
  denying camera/mic/geolocation.
- **Error messages** — server actions return curated, user-facing strings
  only; login failures are a generic "wrong email or password" (no user
  enumeration); unexpected exceptions surface as Next's generic production
  error page (digest only, no stack/paths). Note: the OTP flow necessarily
  reveals whether a code was wrong vs expired — that's standard.

## Known accepted limitations

- The `?error=` query parameter is reflected as escaped text in a few pages.
  No XSS is possible (React escaping), but a crafted link could display an
  attacker-chosen message. Low risk; revisit if phishing becomes a concern.
- Rate limits reset on server restart (in-memory).
- Stored notification bodies are plain text written at event time (English
  only) — no injection risk, just an i18n limitation.

## Deferred — needs its own review when integrated

- **Payment gateway** (FastPay / Zaincash / Qi Card): webhook signature
  verification, idempotency, and amount validation must be reviewed when the
  provider is chosen. Until then, payment is admin-confirmed manually.
- **SMS/WhatsApp provider** (Twilio Verify or local aggregator): move OTP
  delivery out of the server console; review provider credentials handling.
  The console-logged OTP in `src/lib/otp.ts` is a dev-only mechanism and MUST
  be removed when a real provider is wired.
- **S3-compatible storage** for uploads in production (swap the body of
  `saveUpload`); add a virus-scanning step if upload volume grows.

## Manual steps before going live

1. **Rotate secrets for production**: generate a fresh `JWT_SECRET`
   (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
   and a strong Postgres password on the production host — never reuse the
   dev `.env` values (the dev DB password is `carparts`). `.env` is
   gitignored; keep it that way.
2. **HTTPS/TLS**: terminate TLS at the hosting provider or reverse proxy
   (Caddy/nginx/Cloudflare). The `secure` cookie flag activates via
   `NODE_ENV=production` and requires HTTPS to function.
3. **Database**: don't expose Postgres publicly (bind to localhost or a
   private network; the dev `docker-compose.yml` maps it to host port 5433).
   Set up automated backups.
4. **Seeded admin account**: change or delete `admin@carparts.local`
   (password `admin1234`) before production; create real admin accounts with
   strong passwords.
5. **Test data**: wipe the dev test customer (+9647501234567) and its
   requests/uploads before launch.
6. Set `NODE_ENV=production` (activates secure cookies and drops
   `unsafe-eval` from the CSP).
7. If deploying behind a proxy/CDN, confirm `X-Forwarded-For` is set by your
   proxy (rate-limit keys rely on it) and can't be spoofed by clients.
