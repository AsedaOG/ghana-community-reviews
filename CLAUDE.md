# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A members-only, anonymous review platform for Ghana (apartments, landlords, workplaces, schools, hospitals, gyms). Reviewers are shown only as generated usernames (e.g. `KenteEagle412`); businesses claim listings and respond publicly; staff moderate. Full product spec: [Ghana_Community_Review_Platform.md](Ghana_Community_Review_Platform.md).

Two services, developed and run independently:
- `backend/` — Django 5 + Django REST Framework API
- `frontend/` — Next.js 15 (App Router) + Tailwind CSS 4, talking to the API over `NEXT_PUBLIC_API_URL`

## Commands

### Backend (port 8000)

```bash
cd backend
source venv/bin/activate          # existing venv; use `python3 -m venv venv` first time
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data        # Ghana geography + demo content (idempotent)
python manage.py runserver 8000
python manage.py check            # fast sanity check after model/settings changes
```

Config comes from `backend/.env` (loaded via `python-dotenv` in `config/settings.py`; a var already exported in the shell wins over the file). See `backend/.env.example` for every variable and what it unlocks (Postgres, SMTP, Paystack live mode, S3/R2, Google OAuth).

**Running against a remote pooled Postgres (e.g. Supabase) instead of local SQLite**: add `--nothreading` — `runserver 8000 --nothreading`. Django's persistent connections (`conn_max_age`) are thread-local, and the threaded dev server spawns a brand-new thread per request, so a connection is never actually reused — every request pays a fresh TLS+auth handshake to the remote host (over a second to Supabase), and orphaned per-thread connections can exhaust a small pooler connection cap. `--nothreading` makes the connection genuinely persist across requests (only the first request after startup pays the handshake cost). Also use the pooler's *transaction*-mode port (Supabase: 6543, not the session pooler's 5432) — it allows far more concurrent connections, which matters once the frontend dev server, browser, and any `manage.py shell` sessions are all holding their own persistent connection open at once.

No automated test suite exists yet. If you add Django tests, run one with `python manage.py test <app>.tests.<TestClass>.<test_method>`.

### Frontend (port 3000, falls back to 3001 if taken)

```bash
cd frontend
npm install
npm run dev            # dev server
npm run build           # production build — also the closest thing to a full typecheck+build gate
npx tsc --noEmit        # typecheck only, fast
npm run lint            # next lint — not yet configured in this repo (prompts for setup)
```

Config comes from `frontend/.env.local` (see `frontend/.env.local.example`): `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

## Architecture

### The login wall (three layers, not just cosmetic)

1. **Next.js middleware** ([middleware.ts](frontend/middleware.ts)) redirects any unauthenticated request to `/login?next=<path>`. Only `/login`, `/register`, `/business/verify` and `/about` are public.
2. **Server components** read the `gcr_session` cookie and forward the API token ([lib/server-api.ts](frontend/lib/server-api.ts)).
3. **The API itself** defaults `DEFAULT_PERMISSION_CLASSES` to `IsAuthenticated` (`backend/config/settings.py`) — anonymous requests to listings, reviews, categories, billing all 401. Only login, registration, email verification, and the Paystack webhook opt out with an explicit `AllowAny`.

The session lives in a `gcr_session` cookie, not localStorage, specifically so middleware, server components, and client components can all read it. Cookie shape and helpers: `frontend/lib/session.ts` (types + `parseSession`), `frontend/lib/client-session.ts` (client read/write + `apiFetch`), `frontend/lib/server-api.ts` (server-side read).

**Hydration hazard**: any client component that calls `getSession()` during render (not inside `useEffect`) will mismatch between server (`document` undefined → `null`) and client (real cookie) — this has already caused a hydration bug once (`ReviewCard.tsx`). Always resolve the session in `useEffect`/`useState`, not inline in the render body.

### One login endpoint, three account kinds

`accounts/auth_views.py` — a single `session_payload(user, token)` produces the same response shape (`token, kind, name, email, is_staff, username`) regardless of role; the frontend routes on `kind` (`reviewer` | `owner` | `staff`). All three sign in via `POST /api/auth/login/`.

- **Reviewer** — `ReviewerProfile` (`accounts/models.py`), one-to-one with `User`, auto-generates a Ghana-flavored username on save. Registers via `/api/reviewer/register/`, active immediately.
- **Business owner** — `OwnerAccount`, one-to-one with `User`. Registers via `/api/auth/register/`; `User.is_active=False` until an emailed `EmailVerificationToken` is redeemed (`/api/auth/verify/`).
- **Staff** — plain Django `User.is_staff=True`, created via `createsuperuser`; lands on `/admin-panel` (custom moderation queue) as well as having full `/admin/` access.
- **Google sign-in** — `GoogleAuthView` (`accounts/auth_views.py`) verifies the GSI ID token server-side and produces the same `session_payload`. Since Google already verified the email, it skips the verification-email step entirely (activates/verifies on the spot). Frontend: `components/GoogleSignInButton.tsx`, self-hiding when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is unset; mirrored backend gate is `GOOGLE_OAUTH_CLIENT_ID` (503 if unset).

### Backend app boundaries

- `core/` — geography (`Region → District → Area`), `Category`, `Listing`, `ListingRequest` (suggest-a-listing moderation queue).
- `accounts/` — identity: `ReviewerProfile`, `OwnerAccount`, `Badge`, auth views for all three roles.
- `reviews/` — `Review`, `ReviewPhoto`, `Evidence`, `BusinessClaim`, `OwnerResponse`, `ReviewVote`, `ReviewReply`, plus owner-dashboard and moderation views. `IsReviewOwner` permission ties edits to `reviewer.user_id`, never to request data — the reviewer identity for `POST /api/reviews/` always comes from the auth token.
- `billing/` — `SubscriptionPlan`, `Subscription`, `MarketReport`, `ReportPurchase`, `Payment`, plus `paystack.py` (`PaystackClient`).

Each app owns its own `urls.py`; `config/urls.py` just includes all four under `/api/`.

### Geography data

The real Ghana Region → District → Area hierarchy (16 regions, 281 districts, ~20,900 areas) lives in `core/data/gh_locations.csv` (~650KB, committed). `python manage.py import_locations` loads it — idempotent, matches by name, only inserts what's missing; `seed_data` calls it automatically. Districts with no name in the source are grouped under "Unknown" per region.

Because the tree is huge, `GET /api/regions/` returns region → district only (no nested areas — that was a 1MB+ payload before this split). Fetch a district's areas on demand via `GET /api/areas/?district=<id>` for cascading selects.

### Billing: sandbox vs. live, same endpoints

`billing/paystack.py` `PaystackClient().configured` is `False` until `PAYSTACK_SECRET_KEY`/`PAYSTACK_PUBLIC_KEY` are set. With no keys, subscribe/purchase endpoints record a `Payment` locally with status `sandbox` and activate immediately — no code path changes when going live, only env vars. `billing/views.py` exposes `provider_configured` in `/api/billing/status/` so the frontend can show a sandbox-mode notice.

### Feature flags: hide without deleting

`frontend/lib/features.ts` currently holds `PRICING_ENABLED = false`. Pricing/billing UI (nav link, `/pricing` page, `/business/dashboard` subscription section, subscription upsell copy on `/for-business`) is fully built but gated behind this flag rather than removed, so it can be flipped back on with a one-line change. Follow this same pattern — a flag in `lib/features.ts`, `{FLAG && (...)}` at each render site — for any other "build it but don't ship it yet" request, instead of deleting code.

### Key API surface

`Authorization: Token <token>` is required everywhere except the auth endpoints. Full endpoint catalogue (content, owner dashboard, moderation, billing) is documented in [README.md](README.md#key-api-endpoints) — read it before adding or changing endpoints rather than re-deriving conventions from scratch.

## Production notes

- Required env for prod: `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=0`, `DJANGO_ALLOWED_HOSTS`, `DATABASE_URL=postgres://…` (install `psycopg[binary]`), `CORS_ALLOWED_ORIGINS`.
- Media storage: `USE_S3=1` + `AWS_*` vars, plus installing `django-storages` + `boto3` (both commented out in `requirements.txt` until needed).
- Real email (`EMAIL_*`) is required before launch — business accounts cannot be activated without it.
- The session cookie is `SameSite=Lax`; serving over HTTPS in production should also add `Secure` in `frontend/lib/client-session.ts`.
