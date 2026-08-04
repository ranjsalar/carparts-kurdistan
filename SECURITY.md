# Security Notes — KalaryCarPart

Last hardening pass: 2026-08-03 (rate limiting + attack detection). This
summarizes what is handled in the code, what is deliberately deferred, and what
must be done manually before going live.

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
  submission 10/h per customer.

  Counters live in Postgres (`RateCounter`), not process memory. This matters
  operationally: **limits survive restarts and redeploys**, so shipping a
  change no longer hands an in-progress brute-force a clean slate, and the
  numbers stay correct regardless of how many app instances are running. The
  window update is a single `INSERT … ON CONFLICT`, so concurrent requests
  cannot lose updates — verified with 60 simultaneous hits against a limit of
  20, which allowed exactly 20. No Redis or extra service is involved.

  If the database is unreachable the limiter **fails open** and logs. Every
  caller needs the database moments later anyway, so failing closed would not
  protect anything — it would convert a database blip into a site-wide outage.

- **Attack detection** (`src/lib/threat-detection.ts`) — a small detection
  layer over the signals the app already produces. Four patterns are watched,
  all per source IP within a rolling window:

  | Pattern | Triggers when | Rationale |
  |---|---|---|
  | `CREDENTIAL_STUFFING` | failed logins against **5+ distinct accounts** in 15 min | keys on distinct accounts, not raw failures, so one person mistyping their own password never counts toward it |
  | `OTP_ABUSE` | failed OTP checks against **5+ distinct phone numbers** in 15 min | same logic for the phone path |
  | `ADMIN_TARGETING` | **5+ failed admin sign-ins** in 15 min | admin is the highest-value target; set to the lockout threshold so the alert coincides with the account locking |
  | `HIGH_VOLUME` | **150+** auth/submission requests in 5 min | deliberately high — Iraqi carriers use CGNAT heavily, so one IP is not one person |

  Detections are written to `SecurityEvent` and surfaced two ways: a **red
  alert bar** across the top of every admin page (above the amber pending
  payments bar), and a **Security alerts** section at the top of
  `/admin/activity`, styled distinctly from ordinary staff activity. Repeat
  detections from the same source fold into the open alert rather than
  creating a row per attempt, so a sustained attack is one line, not a
  thousand. Acknowledging clears the bar but never deletes the record — it
  stamps who signed it off and when.

  Detection never throws: a failure in this layer is logged and swallowed so
  it cannot break the authentication path it is observing.
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
- **Injection** — database access goes through Prisma's parameterized client.
  There is exactly one raw statement, the rate-limiter upsert in
  `src/lib/rate-limit.ts`; it is a Prisma tagged template, so every value is
  bound as a parameter and never string-interpolated. No shell commands touch
  user input; file paths
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

## Explicitly out of scope

Named so nobody assumes coverage that does not exist:

- **No network-level DDoS protection.** Volumetric attacks are absorbed by
  whatever the hosting platform provides by default and nothing more. If that
  becomes a real concern, the answer is a CDN/WAF in front (Cloudflare's free
  tier is the obvious first step), not application code.
- **No WAF, bot detection, or CAPTCHA.** Automated signup and request
  submission are limited by rate limits only.
- **No IP blocking or automatic banning.** Detection is deliberately
  alert-only: it tells an admin something is happening, it does not decide to
  lock anyone out. Auto-banning on an IP signal that customers share via CGNAT
  would take real customers offline. Blocking a genuinely hostile address is a
  hosting-platform or firewall action, taken deliberately by a human.
- **No network IDS, traffic mirroring, or log shipping.** Everything runs
  inside the app against the existing database.
- **Detection is per-IP and therefore evadable.** An attacker distributing a
  credential-stuffing run across many addresses stays under every threshold
  here. The per-account limits (5 failures/15min per email) and admin lockout
  are what still apply in that case.

## Known accepted limitations

- The `?error=` query parameter is reflected as escaped text in a few pages.
  No XSS is possible (React escaping), but a crafted link could display an
  attacker-chosen message. Low risk; revisit if phishing becomes a concern.
- Rate limiting and detection both key on the client IP taken from
  `X-Forwarded-For`. **If the app is ever reachable directly, rather than only
  through a proxy that overwrites that header, a client can forge it** — which
  would both evade the limits and let someone raise alerts against an innocent
  address. See the pre-launch checklist.
- `HIGH_VOLUME` counts auth and submission endpoints, not page views. Page
  requests are not instrumented, because a database write per page view is the
  wrong trade at this scale.
- Alerts are visible to an admin who logs in; there is no email or WhatsApp
  push. An attack starting on a Friday night is seen when someone next opens
  the admin area. Wiring these into the existing notification system is the
  natural next step once a WhatsApp provider exists.
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
4. **Seeded admin account**: change or delete `admin@kalarycarpart.local`
   (password `admin1234`) before production; create real admin accounts with
   strong passwords.
5. **Test data**: wipe the dev test customer (+9647501234567) and its
   requests/uploads before launch.
6. Set `NODE_ENV=production` (activates secure cookies and drops
   `unsafe-eval` from the CSP).
7. **Confirm `X-Forwarded-For` handling.** Both rate limiting and attack
   detection key on the IP from this header. Confirm the proxy/CDN in front
   **overwrites** it (rather than appending to a client-supplied value), and
   that the app is not reachable directly, bypassing the proxy. If a client can
   set this header, it can both slip past the limits and raise alerts
   attributed to someone else's address.

## Deployment topology

**Instance count could not be verified from this repository.** There is no
deployment configuration here at all — no `railway.json`, `Dockerfile`,
`Procfile` or equivalent; the only compose file is the local dev database. The
number of instances is whatever the hosting dashboard is set to, which is not
visible from the code. Before launch, check the service's replica/scaling
setting directly and confirm it reads 1.

That said, **the answer no longer changes anything.** Rate-limit counters live
in Postgres, so they are correct whether one instance is running or five, and
they survive restarts either way. This was the reason for moving them out of
memory rather than documenting a single-instance assumption: the assumption
could not be verified, and a limiter whose correctness depends on an
unverifiable deployment detail is a bad thing to launch with.

Two things do still assume a single database: the counter table is the shared
state, so all instances must point at the same Postgres, and the opportunistic
pruning of expired counters runs from whichever instance happens to trigger it
(harmless if several do).
