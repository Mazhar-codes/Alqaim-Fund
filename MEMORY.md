# Project Memory — Alqaim Fund (Committee/Chit Fund System)

Read this file first in any new session before touching the code. Keep it updated
as you go: whenever you finish a chunk of work or make a decision, update the
relevant section below (don't just append a log).

## What this project is

Online committee (chit fund) system for Pakistan. Members pay a fixed monthly
installment against one of 3 plans. After enough installments they may request
an interest-free loan — but ONLY for a genuine accident/emergency (death in
family, accident, medical emergency), with admin approval required before any
funds are released. Every rupee in/out per member is tracked in a transaction
ledger. Admin has a full dashboard: stats overview, member management, payment
verification queue, loan/emergency approval queue, reports.

Full original spec (plans, tenure, loan formula, roles, pages) was given by the
user in chat — not duplicated here. Key numbers: Plan A=2000/mo, B=3000/mo,
C=5000/mo. Tenure default 12 months (admin-configurable). Loan eligible after
>=3 paid installments. Max loan = plan monthly amount x 20. No interest, ever.

## Architecture decision (locked in — do not re-litigate without asking user)

- **Framework:** Single Next.js 14 app (App Router), JavaScript (not TS). One
  project = frontend (React pages under `app/`) + backend (Route Handlers under
  `app/api/**/route.js`). Deploys to **Vercel** as-is — this is why we didn't
  use a separate Express server.
- **Auth:** **Firebase Authentication** (email/password provider under the
  hood). Member-facing UX is still "MemberID + password": the login page first
  resolves MemberID -> email via a public lookup endpoint, then signs in with
  Firebase using that email. Firebase custom claim `role: "admin"` marks admins;
  everyone else is `role: "member"`. API routes verify the `Authorization:
  Bearer <idToken>` header server-side with the Firebase Admin SDK — never trust
  a client-supplied role.
- **Database:** **Postgres via Neon** (Vercel's native serverless Postgres
  integration), accessed with **Prisma ORM**. NOT Firestore — this data is
  relational (loan math, ledger balances, joins for reports), which Firestore
  makes painful. Use Neon's **pooled** connection string for `DATABASE_URL`
  (pgbouncer) and the **direct** connection string for `DIRECT_URL` (Prisma
  migrations need a direct, non-pooled connection).
- **File storage:** **Firebase Storage** for payment-proof screenshots and
  loan/emergency supporting documents (death certificate, hospital receipt,
  etc). Client uploads directly to Storage from the browser, then sends the
  resulting download URL to our API — Vercel functions have no persistent disk,
  so we never handle multipart uploads server-side.
- **users table** stores `firebaseUid` (link to Firebase user) instead of a
  password hash — Firebase owns credentials entirely.

## Database schema

Source of truth: `prisma/schema.prisma`. Run `npx prisma migrate dev` locally
against the **direct** Neon URL to generate migrations, `npx prisma generate`
after any schema edit. Models: Plan, User, Installment, Payment, LoanRequest,
LoanRepayment, Transaction (the IN/OUT ledger), Settings.

Notable modeling choices:
- `LoanRequest.reasonCategory` is a required enum (`DEATH_IN_FAMILY`,
  `ACCIDENT`, `MEDICAL_EMERGENCY`, `OTHER_EMERGENCY`) — enforces "loan only for
  a genuine emergency" at the schema level. `description` + `proofUrl` are the
  supporting evidence admin reviews before approving.
- `Transaction.direction` is `IN` (money released TO member, i.e. loan
  disbursement) or `OUT` (money paid BY member, i.e. installment or loan
  repayment) — this is the "in/out" ledger the user asked for. Every approved
  payment, every disbursed loan, and every loan repayment must append a
  Transaction row (see `lib/ledger.js`, not yet written).

## Status: WHAT'S DONE

Everything for a working v1 has been scaffolded:

- [x] Architecture decided (see above). `prisma/schema.prisma` written for
      Postgres — `User.planId`/`cnic` are nullable to allow an admin row with
      no plan.
- [x] `package.json`, `next.config.js`, `tailwind.config.js`,
      `postcss.config.js`, `jsconfig.json` (`@/*` path alias), `.env.example`,
      `.gitignore`.
- [x] `lib/`: `prisma.js`, `firebaseAdmin.js`, `firebaseClient.js`, `auth.js`
      (`requireUser`/`requireAdmin`), `memberId.js`, `dueDate.js`, `loan.js`,
      `ledger.js` (`appendTransaction`), `payments.js` (`applyApprovedPayment`
      shared by auto-verify + admin approve; also posts the loan-repayment
      portion via `recordLoanRepayment` when an installment carries a
      `loanDeduction`), `notify.js` (SMS stub).
- [x] All API routes under `app/api/**` — auth (register, lookup), plans,
      member (overview, installments, payments, loan, transactions, profile),
      admin (stats, members, members/[id], payments, loans, reports,
      settings).
- [x] All pages: landing (`app/page.jsx`), register, login, admin/login,
      member dashboard/payments/loan/transactions/profile, admin
      overview/members/members-[id]/payments/loans/reports/settings.
      Shared bits: `context/AuthContext.jsx`, `components/Navbar.jsx`,
      `StatusBadge.jsx`, `ProtectedRoute.jsx`, `PlanCard.jsx`.
- [x] `prisma/seed.js` (plans A/B/C + default Settings row),
      `scripts/seed-admin.js` (Firebase admin user + `role: admin` claim +
      Prisma User row).
- [x] README with setup + Vercel/Neon/Firebase deploy steps + API list.

## Status: verified so far

- `npm install` completed clean (281 packages, no unresolved peer-dep errors).
- `npx prisma validate` / `npx prisma format` pass against `schema.prisma`.
- `npx prisma migrate diff --from-empty --to-schema-datamodel` generated the
  raw SQL DDL, moved into `prisma/migrations/20260830000000_init/migration.sql`
  (+ `migration_lock.toml`) so `npx prisma migrate deploy` will pick it up
  against a real Neon DB later — this is the "SQL file for the database"
  deliverable. No live Postgres has actually run these statements yet.
- `npx next build` succeeds cleanly (all 33 routes compile and generate — 8
  static pages, 9 dynamic pages, 16 API routes). Fixed two real bugs found by
  the build, not just cosmetic:
  - `lib/firebaseAdmin.js` used to call `initializeApp()`/`cert()` eagerly at
    module scope. Next's build-time "collect page data" step imports every
    route module, so an eager init crashed the whole build on bad/placeholder
    Firebase Admin env vars — and would do the same on a real Vercel deploy if
    those env vars aren't set correctly yet. Changed to a lazy
    `getAdminAuth()` (only initializes on first real call); `lib/auth.js` and
    `app/api/auth/register/route.js` updated to call it instead of importing
    a top-level `adminAuth` constant.
  - `app/register/page.jsx` used `useSearchParams()` without a Suspense
    boundary, which Next's static export requires. Split into an inner
    `RegisterForm` component wrapped by the default-exported `Register` in a
    `<Suspense>`.
  - The `.env` used for this build test (dummy Neon + dummy Firebase values)
    was deleted afterward — nothing real was ever plugged in.

## Status: GitHub + Neon are live

- Pushed to GitHub: https://github.com/Mazhar-codes/Alqaim-Fund (branch
  `main`). `git remote -v` already points there — future changes are just
  `git add` / `commit` / `push`.
- Installed the Neon agent skills (`.agents/skills/neon`,
  `.agents/skills/neon-postgres`, symlinked into `.claude/skills`) via
  `npx skills add neondatabase/agent-skills -s neon -s neon-postgres -y`.
- Real Neon project connected: org `org-nameless-moon-21951461`
  (syedmazharhussainshah7@gmail.com), project `alqaimfund`
  (`jolly-mouse-31772592`), region `aws-us-east-2`, default branch
  `production`. Authenticated via an **org-scoped API key** the user pasted
  in chat (not a personal key — `neon me` fails with "not allowed for
  organization API keys", but `neon projects list --org-id ...` and
  everything else works fine with `--org-id` supplied or after `neon link`).
- `neon link --project-id jolly-mouse-31772592 --org-id org-nameless-moon-21951461`
  was run in the project root — this created `.neon` (linked context) and
  `.env.local` (pulled `DATABASE_URL` + `DATABASE_URL_UNPOOLED`); both are
  now in `.gitignore` (the Neon CLI added them itself, don't remove).
- **This app only uses Neon for Lakebase Postgres** — no Neon Auth, Object
  Storage, Functions, or AI Gateway. Auth is Firebase, file storage is
  Firebase Storage (see architecture decision above). Don't wire up the
  other Neon services unless the user explicitly asks to move off Firebase.
- `.env` (real, gitignored) now has real values for `DATABASE_URL` (Neon's
  pooled URL, `-pooler` host, with `&pgbouncer=true&connection_limit=1`
  appended — Neon's pulled value doesn't include those Prisma-recommended
  params, added manually) and `DIRECT_URL` (Neon's unpooled/direct host,
  from `DATABASE_URL_UNPOOLED`). Firebase vars in `.env` are still empty.
- `npx prisma migrate deploy` applied the `20260830000000_init` migration to
  the real database — all tables exist on Neon now, verified with
  `neon psql production -- -c 'select ... from plans'`.
  `npm run prisma:seed` ran successfully — plans A/B/C and the default
  Settings row are confirmed present via a live query.
- `npm run seed:admin` has **not** been run yet — it needs real Firebase
  Admin credentials, which aren't in `.env` yet.

## Status: WHAT'S NEXT

1. Get Firebase project set up (Auth: Email/Password enabled, Storage
   enabled) and fill in the `NEXT_PUBLIC_FIREBASE_*` + `FIREBASE_ADMIN_*`
   vars in `.env`.
2. `npm run seed:admin` — creates the Firebase admin user + custom claim +
   Prisma User row. Pick a real `ADMIN_SEED_PASSWORD` in `.env` before this
   (not the `admin123` default) if this is heading toward production.
3. `npm run dev` and manually click through the real flow: register → login
   → upload a payment → (as admin) approve it → apply for an emergency loan →
   approve it → confirm the ledger and installment `loanDeduction` show up
   correctly. Schema + seed data are confirmed live now, but the full
   request flow hasn't been exercised against real Firebase yet.
4. Deploy to Vercel: import the GitHub repo, add every var from `.env`
   (including the Neon ones now known-good) as Vercel Environment Variables,
   deploy. `alqaim-fund.vercel.app`-style free domain, no cost — see the
   free-tier notes earlier in this conversation history if picked back up.
5. Bilingual Urdu/English + RTL UI — not started, do in a later pass.
6. SMS provider for MemberID notification — stubbed behind
   `Settings.smsEnabled`, no provider wired up (`lib/notify.js`).
7. Admin login currently uses `ADMIN_SEED_EMAIL` (default
   `admin@alqaimfund.local`) as a placeholder Firebase email — fine as-is,
   just flagging it's synthetic, not a real inbox.

## Known rough edges / things to double check when revisiting

- `app/api/admin/loans` PATCH approve spreads the repayment schedule across
  whatever `PENDING` installments currently exist for the member — if a
  member is near the end of their cycle there may be fewer installments left
  than the chosen tenure; the code clamps to however many exist rather than
  creating new ones. Revisit if that's not the desired behavior.
- No pagination anywhere yet (admin members list caps at 200, reports have
  none) — fine for an MVP, would need it at real scale.
