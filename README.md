# Ghana Community Reviews

A trusted, anonymous review platform for Ghana — apartments, landlords,
workplaces, schools, hospitals and gyms. Reviewers stay anonymous behind
generated usernames; businesses claim their profiles and respond publicly;
administrators curate listings, verify evidence and moderate content.

**The platform is members-only**: you must sign in before you can browse or
review anything. Anonymity is preserved where it matters — reviews are always
published under a generated username, never an email or real name.

Built from [Ghana_Community_Review_Platform.md](Ghana_Community_Review_Platform.md).

## Stack

| Layer    | Technology |
|----------|------------|
| Frontend | Next.js 15 (App Router) + Tailwind CSS 4 |
| Backend  | Django 5 + Django REST Framework |
| Database | PostgreSQL in production (`DATABASE_URL`), SQLite for local dev |
| Storage  | Local disk in dev; Cloudflare R2 / AWS S3 via `USE_S3=1` |
| Search   | PostgreSQL full-text search (falls back to `icontains` on SQLite) |

## Quick start

### 1. Backend (port 8000)

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_data          # Ghana geography + demo content
.venv/bin/python manage.py createsuperuser    # for the admin dashboard
.venv/bin/python manage.py runserver
```

### 2. Frontend (port 3000)

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000>. You land on `/login` — create an account at
`/register` to get in. The Django admin (moderation, evidence verification,
claim approval, dispute handling) is at <http://127.0.0.1:8000/admin/>.

## The login wall

Access is enforced at three layers, so the gate is not just cosmetic:

1. **Next.js middleware** ([middleware.ts](frontend/middleware.ts)) redirects
   any unauthenticated request to `/login?next=<where they were going>`. Only
   `/login`, `/register`, `/business/verify` and `/about` are public.
2. **Server components** read the session cookie and forward the API token, so
   server-rendered pages fetch as the signed-in user
   ([lib/server-api.ts](frontend/lib/server-api.ts)).
3. **The API itself** defaults to `IsAuthenticated`; anonymous requests to
   listings, reviews, categories or billing get a 401. Only login,
   registration, email verification and the Paystack webhook opt out.

The session lives in a `gcr_session` cookie (not localStorage) precisely so
middleware and server components can both see it.

## Accounts & roles

Everyone signs in through one form at `/login`; the API returns a `kind`
(`reviewer`, `owner` or `staff`) that decides where they land and what the
header menu offers.

- **Reviewers** register at `/register` with email + password and are signed in
  immediately. They get a generated username (e.g. `KenteEagle412`) — the only
  thing shown publicly. The email is never displayed anywhere. Their profile
  (username, reputation, badges, review history) is at `/reviewer/profile`.
- **Blocking**: staff can block a reviewer from the moderation panel (or
  Django admin). Blocking rejects new reviews immediately and disables the
  login; existing reviews stay up until removed individually.
- **Business owners** register at `/register?role=business` with email + password.
  The account starts inactive; a verification email (printed to the Django
  terminal in dev, real SMTP via `EMAIL_*` env vars in production) activates
  it. The dashboard at `/business/dashboard` handles claims, public responses,
  profile edits and subscriptions.
- **Staff** sign in with the same login form and land on `/admin-panel`: a
  moderation queue for pending claims, evidence verification and flagged
  reviews. (Create staff with `python manage.py createsuperuser`; a seeded
  test account exists — `admin@gcr.local` / `ChangeMe-Admin1` — change or
  delete it.) The full Django admin remains at `/admin/`.

## Payments (Phase 2 & 3)

The `billing` app implements subscription plans (Phase 2) and market
intelligence reports (Phase 3) with a Paystack integration — chosen because it
covers Ghana well (cards, MTN MoMo, Telecel Cash, AT Money).

**No API keys are configured yet, and that's fine**: the payment layer runs in
**sandbox mode** — payments are recorded locally with status `sandbox` and
subscriptions/purchases activate immediately, so the whole product flow is
testable end to end. To go live, no code changes are needed:

1. Add `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY` to the backend env
   (from dashboard.paystack.com — test keys work the same way).
2. Set the webhook URL in the Paystack dashboard to
   `https://<api-host>/api/billing/webhook/paystack/` (signature-verified,
   HMAC-SHA512).
3. Subscribe/purchase endpoints then return an `authorization_url`; the
   frontend already redirects to it, and the webhook confirms the charge and
   activates the subscription or report purchase.

See `backend/.env.example` for every variable.

## How the core flows work

- **Anonymous reviews** — `POST /api/reviews/` takes the reviewer identity from
  the auth token, never from the request body, so nobody can post as someone
  else. The review is published under the account's generated Ghana-flavoured
  username (e.g. `KenteEagle412`); reputation and badges (First Voice →
  Community Guide → Trusted Voice) accrue to that identity.
- **Photos & evidence** — photos ride along as multipart files (rejected for
  Workplaces to protect anonymity). Evidence files are private; admins verify
  them and upgrade reviews to **Verified Experience**.
- **Business responses** — owners claim a listing from their dashboard; staff
  approve it (moderation panel or Django admin); the owner then responds to
  reviews and edits the listing profile from the dashboard.
- **Geography** — the real Ghana Region → District → Area hierarchy: all 16
  regions, 281 districts and ~20,900 areas, imported from a GPS-tagged
  locations dataset (`core/data/gh_locations.csv`, ~650KB, committed to the
  repo). Districts with no name in the source data are grouped under
  "Unknown" per region so every area still has a home.
  `python manage.py import_locations` loads it (idempotent — matches existing
  rows by name, only inserts what's missing); `seed_data` calls it
  automatically. Because the tree is huge, `GET /api/regions/` only returns
  region → district (no nested areas — that was a 1MB+ payload before this
  split); fetch a district's areas on demand from
  `GET /api/areas/?district=<id>` when building a cascading select.

## Key API endpoints

Everything except the four auth endpoints below requires
`Authorization: Token <token>`.

```
# Public (no token)
POST /api/auth/login/                 any role → {token, kind, name, …}
POST /api/reviewer/register/          email, password → signed in immediately
POST /api/auth/register/              business: → verification email
POST /api/auth/verify/                token from the email → activates + signs in
POST /api/billing/webhook/paystack/   Paystack charge webhooks (signature-checked)

# Content
GET  /api/categories/                 six core categories
GET  /api/regions/                    region → district tree (no areas nested)
GET  /api/areas/?district=<id>        areas for one district (lazy-loaded)
GET  /api/listings/?q=&category__slug=&area__district__region__slug=
GET  /api/listings/<slug>/
POST /api/listings/                   staff-only direct creation
POST /api/listing-requests/           anyone: suggest a listing → moderation queue
GET  /api/listing-requests/           my own suggestions + their status
GET  /api/reviews/?listing__slug=&reviewer__username=
POST /api/reviews/                    multipart; photos[] + evidence[] optional
GET  /api/badges/

# Me
GET  /api/reviewer/me/                username, reputation, badges
GET  /api/auth/account/               session check
POST /api/auth/logout/                revokes the token

# Owner dashboard
GET   /api/owner/overview/            claims + listings + reviews in one call
POST  /api/owner/claim/               claim a listing
POST  /api/owner/respond/             public response to a review
PATCH /api/owner/listings/<slug>/     update description/address

# Moderation (staff token)
GET  /api/moderation/queue/           pending claims, evidence, flagged reviews
POST /api/moderation/claims/<id>/     {"decision": "approve"|"reject"}
POST /api/moderation/evidence/<id>/   {"verified": true} → upgrades review
POST /api/moderation/reviews/<id>/    {"action": "remove"|"restore"|"flag"}
GET  /api/moderation/reviewers/?q=    search reviewers
POST /api/moderation/reviewers/<id>/  {"action": "block"|"unblock"}
GET  /api/moderation/listing-requests/?status=pending
POST /api/moderation/listing-requests/<id>/
     {"decision": "approve"|"reject", "admin_note": "…"}
     approving creates the Area too if the requester typed a new one

# Billing
GET  /api/billing/plans/  /reports/   catalogue
GET  /api/billing/status/             my subscription, purchases, payments
POST /api/billing/subscribe/          {"plan": "business-starter"}
POST /api/billing/purchase-report/    {"report": "<slug>"}
GET  /api/billing/reports/<slug>/download/
```

## Production notes

- Set `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=0`, `DJANGO_ALLOWED_HOSTS`,
  `DATABASE_URL=postgres://…` (install `psycopg[binary]`), and
  `CORS_ALLOWED_ORIGINS`.
- For R2/S3 media: `USE_S3=1` plus `AWS_*` vars, and install
  `django-storages` + `boto3` (commented in `requirements.txt`).
- Point the frontend at the API with `NEXT_PUBLIC_API_URL`
  (see `frontend/.env.local.example`).
- Configure real email (`EMAIL_*`) before launch — business accounts cannot be
  activated without it.
- The session cookie is set with `SameSite=Lax`; serve the frontend over HTTPS
  in production and add `Secure` to the cookie in
  [lib/client-session.ts](frontend/lib/client-session.ts).
