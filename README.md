# Alqaim Fund — Committee / Chit Fund System

Online committee fund for Pakistan. Members pay a fixed monthly installment
against one of 3 plans; after enough installments they may request an
interest-free loan — but **only for a genuine emergency** (death in the
family, accident, medical emergency), subject to admin approval before any
funds move. Every rupee in/out per member is tracked in a transaction ledger.
Admin gets a full dashboard: overview stats, member management, payment
verification queue, loan/emergency approval queue, reports.

See `MEMORY.md` for the architecture decisions and current build status —
read that first if you're picking this project back up.

## Stack

- **Next.js 14** (App Router, JavaScript) — one project for both the React
  frontend (`app/**/page.jsx`) and the API (`app/api/**/route.js`). Deploys
  to **Vercel** as-is.
- **Firebase Authentication** for login (email/password under the hood; the
  UI presents it as "MemberID + password"). Custom claim `role: "admin"`
  marks admins.
- **Postgres on Neon** (Vercel's native Postgres integration) via **Prisma**.
- **Firebase Storage** for payment-proof screenshots and loan/emergency
  supporting documents.

## Setup

1. **Install dependencies**
   ```
   npm install
   ```

2. **Create a Neon Postgres database** (via the Vercel dashboard → Storage →
   Create Database → Postgres, or directly at neon.tech). Copy both the
   **pooled** connection string and the **direct** (unpooled) one.

3. **Create a Firebase project** (console.firebase.google.com):
   - Enable **Authentication → Email/Password**.
   - Enable **Storage**.
   - Grab the web app config (Project settings → General → Your apps) for
     the `NEXT_PUBLIC_FIREBASE_*` values.
   - Generate a service account key (Project settings → Service accounts →
     Generate new private key) for the `FIREBASE_ADMIN_*` values.

4. **Copy `.env.example` to `.env`** and fill in the Neon + Firebase values.

5. **Push the schema and seed the plans**
   ```
   npx prisma migrate dev --name init
   npm run prisma:seed
   ```

6. **Create the admin account** (reads `ADMIN_SEED_*` from `.env`):
   ```
   npm run seed:admin
   ```
   Default: username `admin`, password `admin123` — **change
   `ADMIN_SEED_PASSWORD` before running this against a real deployment.**

7. **Run locally**
   ```
   npm run dev
   ```

## Deploying

1. Push this repo to GitHub, import it in Vercel.
2. Add all the `.env` values as Vercel Environment Variables (Project →
   Settings → Environment Variables) — for both Production and Preview.
3. Attach the Neon database via the Vercel Storage tab (or keep the manual
   `DATABASE_URL` / `DIRECT_URL` you set up in step 2 above).
4. Deploy. Run `npx prisma migrate deploy` once (locally, pointed at the
   production `DIRECT_URL`, or via a Vercel deploy hook) to apply the schema,
   then `npm run prisma:seed` and `npm run seed:admin` the same way.

## Business rules implemented

- Plans: A = Rs. 2,000/mo, B = Rs. 3,000/mo, C = Rs. 5,000/mo. Tenure
  defaults to 12 months, editable by admin (Settings page / `Plan` table).
- Due date = 30th of the month, rolled to Monday if the 30th is a Sunday
  (`lib/dueDate.js`).
- Loan eligibility: `paidInstallments >= Settings.minInstallmentsForLoan`
  (default 3) **and** no loan already pending/active (`lib/loan.js`).
- Max loan = plan monthly amount × `maxLoanMultiplier` (default 20).
- **Loans are emergency-only.** The application form requires a reason
  category (death in family / accident / medical emergency / other genuine
  emergency), a written description, and an optional supporting document.
  The request sits as `PENDING` until an admin reviews it — approval is what
  releases funds and schedules repayment; rejection just closes it with a
  reason.
- No interest: `buildRepaymentSchedule` splits the loan into equal monthly
  deductions, with any rounding remainder absorbed into the final
  installment so the member never repays more than they borrowed.
- Every approved payment, loan disbursement, and loan repayment appends a row
  to the `Transaction` ledger (`lib/ledger.js`) with a running `IN`/`OUT`
  balance — visible to the member (`/member/transactions`) and to admin on
  each member's full ledger (`/admin/members/[id]`).
- Manual upload + basic auto-verification, no paid payment gateway: a member
  uploads a screenshot; if the amount matches what's due and the payment date
  is in the current month, it's auto-approved. Otherwise it's queued for
  admin review (`/admin/payments`). Admin can also record a cash payment
  directly ("Add Payment Manually").

## API endpoints

Public:
- `GET /api/plans` — list plans
- `POST /api/auth/register` — body `{ idToken, name, cnic, phone, address, planId }`
- `GET /api/auth/lookup?loginId=` — resolves MemberID/admin username → email

Member (Bearer Firebase ID token required):
- `GET /api/member/overview`
- `GET /api/member/installments`
- `GET /api/member/payments`, `POST /api/member/payments`
- `GET /api/member/loan`, `POST /api/member/loan`
- `GET /api/member/transactions`
- `GET /api/member/profile`, `PATCH /api/member/profile`

Admin (Bearer Firebase ID token, `role: admin` claim required):
- `GET /api/admin/stats`
- `GET /api/admin/members`, `GET /api/admin/members/[id]`, `PATCH /api/admin/members/[id]`
- `GET /api/admin/payments`, `POST /api/admin/payments` (manual cash entry), `PATCH /api/admin/payments` (approve/reject)
- `GET /api/admin/loans`, `PATCH /api/admin/loans` (approve/reject — approve releases funds)
- `GET /api/admin/reports?type=collection|defaulters|loans&format=json|xlsx`
- `GET /api/admin/settings`, `PATCH /api/admin/settings`
- `PATCH /api/plans` — admin-only, edit a plan's amount/tenure/multiplier

## Not yet done (see MEMORY.md)

- Bilingual Urdu/English + RTL UI.
- SMS notification of MemberID (stubbed behind `Settings.smsEnabled`, no
  provider wired up yet — see `lib/notify.js`).
