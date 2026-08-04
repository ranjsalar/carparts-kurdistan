# KalaryCarPart

[![CI](https://github.com/ranjsalar/carparts-kurdistan/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/ranjsalar/carparts-kurdistan/actions/workflows/ci.yml)

A web platform for ordering car parts in Kurdistan, Iraq — for any brand, any model, any year.

Finding a specific replacement part here is harder than it should be. Local shops stock a narrow
range, and anything unusual means calling around, waiting on vague promises, and often paying
whatever you're quoted at the end with no idea what went into the number. Pre-stocking every part
for every vehicle on the road isn't realistic for anyone.

So this platform is built around **request and quote** rather than a fixed-price catalogue. A
customer picks their exact vehicle and the part they need, the team sources it from China or Dubai,
and the customer gets back an **itemised** price — part, shipping, tax, local delivery — before
committing to anything. If they approve it, they pay and then follow the order all the way from the
supplier to their door.

**Who it's for:** car owners and small garages in Kurdistan who need a specific part and want a
clear price and a real timeline, plus the small team sourcing those parts who needs to manage the
pipeline without living in a spreadsheet.

---

## Screenshots

<!-- Add screenshots here -->

| | |
|---|---|
| _Homepage_ | _Request form_ |
| _Customer quote_ | _Admin dashboard_ |

---

## Features

### For customers

- **Vehicle-first search** — brand → model → year range, over a taxonomy of 35 brands, 156 models
  and 265 year ranges curated for what's actually on the road in Iraq: Toyota, Hyundai and Kia
  alongside American pickups, German saloons and the increasingly common Chinese SUVs.
- **Guided request form** — pick a part by category, and for painted parts the form asks for your
  paint colour code and explains where to find it on the car. Attach a photo of the part or your
  VIN plate if it helps.
- **Choose your sourcing route** — China (roughly 2 months, cheaper) or Dubai (roughly 20 days),
  with the trade-off spelled out before you choose.
- **Itemised quotes** — every quote breaks down into part price, shipping and sourcing, tax, and
  local delivery, so you can see what you're paying for instead of one opaque number.
- **Indicative price ranges** — many parts show a typical range on the request form, so if you're
  just checking roughly what something costs, you get an answer immediately.
- **Approve, then pay** — nothing is charged until you accept a quote. Cash on delivery, bank
  transfer with receipt upload, or online payment.
- **Order tracking** — follow the order through sourcing, shipping, customs, arrival and delivery,
  with a timestamped history and notes from the team at each stage.
- **Notifications** — in-app alerts when a quote is ready, a payment is confirmed, or the shipment
  moves.

### For the team

- **Requests queue** — filter by status, see the whole pipeline at a glance, and spot customers who
  submit many requests but never approve one.
- **Itemised quote builder** — enter the four cost components and the total is calculated for you,
  then recomputed server-side rather than trusted from the browser.
- **Payment confirmation and shipment workflow** — statuses advance one step at a time and can't be
  skipped or reversed, with an optional note to the customer at each step.
- **Taxonomy management** — add brands, models, year ranges, categories and parts as gaps appear;
  flag which parts need a colour code and set indicative price ranges.
- **Dashboard** — requests today, pending quotes, revenue this month, orders by stage, and an admin
  login audit trail.

### Platform

- **Three languages, properly** — English, Kurdish (Sorani) and Arabic across the entire interface,
  with full right-to-left layout and a typeface per language: Inter for English, Vazirmatn for
  Kurdish and Cairo for Arabic, each carrying both headings and body so hierarchy comes from
  weight. Reading sizes are nudged up slightly for the Arabic script, where it still helps.
- **Mobile-first** — every page verified at a 375px viewport, since most customers arrive on a
  phone.
- **Security** — account lockout on repeated failed admin logins, database-backed rate limiting on
  authentication and submissions (counters survive restarts and multiple instances), detection of
  credential-stuffing, OTP-abuse and admin-targeting patterns with a red alert bar for admins,
  uploads validated by file signature rather than filename, and a strict content security policy.
  See [SECURITY.md](./SECURITY.md).

---

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Server Actions) |
| Language | TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma 7 |
| Styling | Tailwind CSS v4 |
| Internationalisation | next-intl |
| Auth | JWT sessions (`jose`), bcrypt password hashing |
| Validation | Zod |
| Local infrastructure | Docker Compose |

No paid services or third-party accounts are needed to run this locally.

---

## Getting started

**Prerequisites:** Node.js 20+ (developed on 22), Docker Desktop, npm.

**1. Clone and install**

```bash
git clone https://github.com/ranjsalar/carparts-kurdistan.git
cd carparts-kurdistan
npm install
```

**2. Configure environment**

```bash
cp .env.example .env
```

Then edit `.env`:

```env
# Matches the docker-compose service below — change both together if you
# change the credentials.
DATABASE_URL="postgresql://carparts:carparts@localhost:5433/carparts"

# Generate your own, never reuse this placeholder:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET="replace-with-a-long-random-string"
```

**3. Start the database**

```bash
docker compose up -d
```

This runs PostgreSQL 16 on port **5433** rather than the default 5432, so it won't clash with an
existing local Postgres installation.

**4. Set up the schema and seed data**

```bash
npx prisma migrate deploy
npx prisma generate
npx prisma db seed
```

The seed creates the vehicle and part taxonomy plus a development admin account, and prints its
credentials. Read the warning below before deploying anywhere.

**5. Run it**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Signing in

- **Customers** register with email and password, or sign in with a phone number and a one-time
  code. There's no SMS provider wired up in development, so **the code is printed to the server
  console** — copy it from your terminal.
- **Admins** sign in with email and password. Repeated failed attempts lock the account for 15
  minutes, and every attempt is recorded in the admin login audit trail on the dashboard.

> [!WARNING]
> The seeded admin account exists only to get you running locally. **Change its email and password —
> ideally delete the account entirely — before deploying this anywhere reachable.** The seed script
> is public, so its default credentials are public too. `SECURITY.md` has a full pre-launch
> checklist.

---

## Notes for developers

A few things here look unusual if you're used to older major versions of these libraries. They're
deliberate:

- **Next.js 16 renamed middleware to proxy.** The route gate protecting `/admin` lives in
  `src/proxy.ts`, not `middleware.ts`, and the config keys followed the same rename
  (`skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`, and so on).
- **Prisma 7 moved the datasource URL out of the schema.** `schema.prisma` no longer carries a
  `url`; the connection string is configured in `prisma.config.ts`, and the client is built with the
  `@prisma/adapter-pg` driver adapter in `src/lib/db.ts`. The generated client lands in
  `src/generated/prisma` and is gitignored — run `npx prisma generate` after pulling schema changes.
- **Tailwind v4 has no `tailwind.config.js`.** Design tokens — colours, type scale, fonts — are CSS
  custom properties in an `@theme` block in `src/app/globals.css`. Changing a token there updates
  every component using the matching utility class.
- **Translation keys are verified, not assumed.** `npx tsx keys-check.ts` checks that all three
  message files have identical key sets, which catches a key added to English but forgotten in
  Kurdish or Arabic.

### Project layout

```
messages/              en / ku / ar translation files
prisma/
  schema.prisma        data model
  migrations/          migration history
  seed.ts              taxonomy + development admin account
src/
  app/
    (auth)/            login, signup, phone OTP
    (customer)/        request form, my requests, tracking, notifications
    (marketing)/       about, contact, FAQ, terms, privacy
    admin/             dashboard, requests queue, quoting, taxonomy
    globals.css        design tokens (@theme)
  components/          shared UI, icons, logo
  i18n/                locale resolution
  lib/                 auth, quotes, payments, shipments, storage, rate limiting
  proxy.ts             admin route gate
```

### Useful commands

```bash
npm run dev              # development server
npm run build            # production build
npm run lint             # eslint
npx tsc --noEmit         # type check
npx tsx keys-check.ts    # verify translation key parity
npx prisma studio        # browse the database
```

---

## CI/CD

Two separate systems, and it is worth being precise about which does what — they
are often conflated.

| | Role |
|---|---|
| **GitHub Actions** (`.github/workflows/ci.yml`) | The quality gate. Answers "is this commit sound?" |
| **Railway** | The deployment. Watches this repository and ships `main` on its own. |

**The pipeline does not deploy anything.** Railway auto-deploys from GitHub once
connected, so a deploy step here would mean two systems racing to release the
same commit. CI verifies; Railway ships.

Every push on any branch, and every pull request targeting `main`, runs:

1. `npm ci` — installs exactly the lockfile, failing if it has drifted from `package.json`
2. `npx prisma generate` — the client is gitignored, so a fresh checkout has no types without this
3. `npx prisma migrate deploy` — against a real Postgres 16 service container, which proves the
   migration history applies cleanly to an empty database rather than only to your laptop
4. `npx tsc --noEmit` — type check
5. `npm run lint` — ESLint
6. `npx tsx keys-check.ts` — translation key parity across en/ku/ar
7. `npm run build` — full production build

All seven must pass. Any failure turns the run red, and the badge above tracks
`main`.

> [!IMPORTANT]
> A red X does not block Railway by itself. To make this an actual gate rather
> than a notification, enable branch protection on `main` (Settings → Branches)
> requiring the **CI** check to pass, and merge through pull requests. Without
> that, a direct push to `main` deploys whether CI is happy or not.

## Project status

**This is an active project, not a finished product.** The full request → quote → approve → pay →
track flow works end to end and the admin side is complete enough to run real orders, but several
pieces are deliberately still stubbed:

- **Notifications are in-app only.** WhatsApp delivery is designed for and marked in the code
  (`src/lib/quotes.ts`, `payments.ts`, `shipments.ts`) but needs a WhatsApp Business API account.
- **Payment is recorded, not processed.** Customers choose a method and the team confirms receipt
  manually. Integrating a real gateway (FastPay, Zaincash, Qi Card) is the next significant piece.
- **Phone verification codes print to the server console** rather than being sent by SMS.
- **Uploads are stored on local disk.** `src/lib/storage.ts` is written so that swapping in
  S3-compatible storage is a change to a single function.
- **The Kurdish and Arabic part terminology deserves a native-speaker review.** Automotive
  vocabulary borrows inconsistently from Arabic, Turkish and English, and a handful of terms are
  best-effort rather than settled.

Native iOS and Android apps are the longer-term plan; the data model and workflows were built with
that in mind.
