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
C=5000/mo. Tenure default 12 months (admin-configurable). Loan eligible only
after completing the full 12-month cycle (>=12 paid installments — changed
from the original spec's "3 installments" per explicit user request in a
later session; see `Settings.minInstallmentsForLoan`, still admin-configurable).
Max loan = plan monthly amount x 20. No interest, ever. Registration is
Gmail-only (`@gmail.com`), CNIC auto-formats with dashes as typed, admin can
permanently delete a member account (cascades all their records).

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
- **File storage:** **Cloudinary** (unsigned upload preset), NOT Firebase
  Storage — Firebase Storage started requiring the paid Blaze plan for new
  buckets in Oct 2024, and the user wants everything free with no card on
  file. Client uploads directly to Cloudinary from the browser via
  `lib/cloudinary.js`'s `uploadToCloudinary(file, folder)`, gets back a
  `secure_url`, and only that URL is sent to our API — Vercel functions have
  no persistent disk, so we never handle multipart uploads server-side.
  Firebase is Auth-only now (`lib/firebaseClient.js` no longer exports
  `firebaseStorage`). Three things get uploaded: payment-proof screenshots,
  loan/emergency supporting documents, and member profile pictures.
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
  Cloudinary (see architecture decision above, updated after this was
  originally written). Don't wire up the other Neon services unless the
  user explicitly asks to move off this stack.
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

## Status: Cloudinary is live, profile pictures added

- Real Cloudinary account: cloud name `dyxs21tzy`, unsigned upload preset
  named **`alqaim proofs`** (literally has a space in it — that's the real
  name, verified by test-uploading a 1x1 PNG via curl before trusting it).
  Both are in `.env` as `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` /
  `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`.
- `lib/cloudinary.js` — `uploadToCloudinary(file, folder)`, posts to
  `https://api.cloudinary.com/v1_1/<cloud>/auto/upload` with the unsigned
  preset, returns `secure_url`. Used by `app/member/payments`,
  `app/member/loan`, and `app/member/profile` (photo upload).
- `lib/firebaseClient.js` no longer touches Storage — Auth only now, and
  initialization is guarded with `typeof window !== "undefined"` (see bug
  fix below).
- Added `User.photoUrl` to the schema (migration
  `20260830205153_add_user_photo_url`, already applied to the real Neon DB)
  — a member's profile picture, set from `/member/profile`, shown on the
  member dashboard header, the admin members list (small avatar per row),
  and each member's admin ledger page (`/admin/members/[id]`).
- Fixed a second eager-init build bug, same class as the `firebaseAdmin.js`
  one from earlier: `lib/firebaseClient.js`'s `getAuth(firebaseApp)` ran at
  module-import time, and Next prerenders "use client" pages on the server
  too (no real browser, and Firebase env vars are still empty at this
  point) — `auth/invalid-api-key` was crashing every single page's build.
  Fixed by only constructing `firebaseApp`/`firebaseAuth` when
  `typeof window !== "undefined"`; both are `undefined` during server-side
  prerendering, which is safe because every real usage happens inside
  `useEffect` or event handlers, never during the render pass itself.
  Rebuilt clean afterward (all 33 routes) — confirms this is a genuinely
  fixed bug, not just "should be fine."

## Status: Firebase is live, full flow verified end-to-end

- Real Firebase project `alqaimfund`: web app config + Admin SDK service
  account both pulled straight from files on disk instead of pasting
  secrets in chat — client config came from the Firebase console snippet
  the user pasted, but the Admin SDK service account JSON was found and
  read directly from `C:\Users\<user>\Downloads\alqaimfund-firebase-adminsdk-*.json`
  (glob by `-iname "*firebase-adminsdk*.json"`) — worth remembering this
  trick for future secret-file handoffs, it avoids the value ever touching
  the chat transcript.
- Real admin account seeded via `npm run seed:admin` with a user-chosen
  password (not the `admin123` placeholder) — confirmed both in Firebase
  (`getUserByEmail` succeeded) and in Postgres (`role=ADMIN` row exists).
- **Full manual verification pass, all against the live Neon DB + real
  Firebase + real Cloudinary (not mocked, not assumed):**
  - Admin login (MemberID-style username → email lookup → Firebase
    signIn → custom claim check) — works, redirects to `/admin` overview
    with correct (zero) stats.
  - Member registration — creates Firebase user, generates `USR001`,
    builds the 12-installment schedule with correct due dates (verified
    the Aug-30-2026-is-a-Sunday → rolls to Aug 31 case, and the
    Feb-28-2027-is-a-Sunday → rolls to Mar 1 case).
  - Member login via MemberID + password (the lookup-then-signIn flow).
  - Payment upload → Cloudinary upload → auto-verification (amount +
    date match) → installment marked PAID → ledger OUT entry — did this
    3x to reach loan eligibility (3 paid installments).
  - Emergency loan application: eligibility gate (`Eligible — max Rs.
    40,000` for a 2000/mo plan), reason dropdown, description, and a
    Cloudinary-uploaded supporting document — confirmed the real
    `proofUrl` landed in Postgres.
  - Admin loan approval (tested via a real Firebase-issued ID token +
    curl, since the UI's `window.prompt()` calls for admin note/tenure
    would have blocked the browser-automation session — see rough edge
    below) — released funds (`IN` ledger entry), spread the Rs. 20,000
    over 5 installments as Rs. 4,000 `loanDeduction` each (installments
    4–8), left installments 9–12 untouched.
  - Loan repayment: paid installment #4 (Rs. 2,000 plan + Rs. 4,000
    deduction = Rs. 6,000) — correctly split into two ledger rows
    (`INSTALLMENT_PAYMENT` 2,000 + `LOAN_REPAYMENT` 4,000), created a
    `LoanRepayment` row, updated `loan.totalRepaid` to 4,000, loan stayed
    `ACTIVE` (correctly, since 4,000 < 20,000).
  - Admin `/api/admin/stats` reconciled exactly against manual math:
    `collectionThisMonth: 12000` (3×2000 + 6000), `loanOutstanding: 16000`
    (20000-4000) — confirms the aggregation queries are correct, not just
    the write paths.
- **Found and fixed a real cross-cutting bug during this pass**: due
  dates / payment dates displayed one day off (e.g. a payment on Aug 30
  showed as "29/08/2026"). Root cause: `lib/dueDate.js` built due dates
  with local-timezone `new Date(year, month, day)` while date-only strings
  from `<input type="date">` parse as **UTC** midnight — a mismatch that
  shifts by ±1 day depending on which timezone the server process (or the
  viewer's browser) happens to be in. Fixed by rebuilding `lib/dueDate.js`
  entirely on `Date.UTC`/`getUTC*`, fixing the same local-getter bug in
  `lib/payments.js`'s `passesAutoVerification` month comparison, and adding
  `lib/formatDate.js` (`toLocaleDateString(undefined, {timeZone:"UTC"})`)
  which every page now uses instead of raw `.toLocaleDateString()`. This
  is exactly the kind of thing that reads as "probably fine" until you
  actually run it against a real clock in a real timezone — worth
  remembering as a category of bug to watch for if more date logic gets
  added later.
- Test data now sits in the real `alqaimfund` Neon project: member
  `USR001` ("Test Member One"), one admin, 4 payments, 1 active loan.
  Harmless, but the user may want it cleared before real members start
  registering — hasn't been asked about yet, don't delete unprompted.

## Status: Visual/UX redesign pass (this session)

The user said the site "doesn't look good and attractive," asked for
graphics/interactive things/buttons and for everything to still be fully
functional. Did a full design pass, not just a coat of paint:

- Added `lucide-react` (real npm package, current major is 1.x — don't be
  thrown by the version number, it's legit) for icons everywhere.
- `next/font/google` Inter loaded in `app/layout.jsx` via a CSS var
  (`--font-inter`), wired into `tailwind.config.js` `fontFamily.sans`.
- `tailwind.config.js` extended: fuller `brand`/`accent` color ramps, and
  keyframe animations (`fade-in-up`, `fade-in`, `blob`, `scale-in`,
  `shimmer`) used for scroll reveals, blob backgrounds, modals, and
  skeleton loaders. `app/globals.css` adds `scroll-behavior: smooth`, a
  slim custom scrollbar, and a `.skeleton` shimmer utility.
- New shared components: `Button.jsx` (variants, loading spinner, hover
  lift), `Modal.jsx` (accessible dialog — Escape to close, backdrop click),
  `FileDropzone.jsx` (drag-and-drop styled file input, still a real hidden
  `<input type="file">` underneath — confirmed the browser-automation
  `file_upload` tool still targets it fine despite being visually hidden),
  `Reveal.jsx` + `lib/useReveal.js` (IntersectionObserver-based
  scroll-triggered fade-in, one-shot per element).
- **Replaced `window.prompt()` with real `Modal` dialogs** in
  `app/admin/payments` and `app/admin/loans` (reject reason / admin note /
  repayment tenure). This was flagged as a rough edge last session because
  `window.prompt()` blocks browser-automation entirely once triggered —
  now fixed, and manually re-verified end-to-end in a live browser: opened
  the reject-payment modal, filled the reason, submitted, watched the
  queue refresh correctly. No more need to route around it via curl.
- Landing page (`app/page.jsx`) fully rebuilt: gradient-blob hero with
  animated background shapes, "How It Works" 3-step section with a
  connecting line, enhanced `PlanCard` (icons, "Most Popular" badge on the
  middle plan, hover lift), feature cards, gradient CTA band, footer.
  Manually scrolled through the whole thing in a real browser to confirm
  every section renders and animates correctly (not just "should render").
- Every dashboard/list page got: icon-labeled stat cards with hover lift,
  skeleton loaders instead of plain "Loading…" text, empty states with an
  icon instead of a bare sentence, `StatusBadge` got status-specific icons.
- `Navbar` rebuilt: sticky + backdrop-blur, active-link highlighting via
  `usePathname`, icons per link, a real mobile hamburger menu (`lg:hidden`
  breakpoint — not manually re-verified at a narrow viewport this session
  because `resize_window` didn't visibly change the automated screenshot
  size in this environment; the responsive classes follow the same
  mobile-first Tailwind pattern used throughout and should be trusted, but
  if the user reports mobile nav issues, check this first).
- Found and fixed a real bug introduced by testing, not shipped: initially
  gave the `ACTIVE` status (used for both "loan actively being repaid" and
  "member account active") a spinning `Loader2` icon — looked like a
  stuck loading spinner on a perfectly normal active member row. Caught it
  by actually looking at the rendered admin members table, not just
  reading the code. Fixed to a static `Activity` icon, no animation.
- Full manual re-verification pass in a real browser against the live
  Neon DB + Firebase + Cloudinary (same rigor as the previous session):
  admin login → overview stats correct → member list/ledger detail with
  photo/status/icons all correct → payment queue reject-via-modal → member
  login → loan page eligibility-blocked state → payments page
  FileDropzone (uploaded a real file, confirmed the green "uploaded"
  state renders). Everything held up.

## Status: Registration/eligibility/delete-account changes (this session)

User asked, in one message: what were the admin credentials, auto-format
CNIC dashes, Gmail-only registration, whether admin can delete an account,
whether loan eligibility should be 12 months or admin-discretion-only, a
mobile-friendly pass, a "Home" nav link (screenshot showed it missing on
`/login`), and more landing-page interactivity/3D. Asked ONE clarifying
question (loan eligibility, since it's a real money rule) via
AskUserQuestion — answer: **require the full 12-month cycle**, not 3
installments. Everything else was unambiguous enough to just implement.

- `lib/validators.js` (new) — `isValidCnic` (moved out of `lib/memberId.js`),
  `formatCnic` (auto-inserts dashes as the user types: `4210112345671` ->
  `42101-1234567-1`), `isGmailAddress` (`@gmail.com` only, case-insensitive).
  Used both client-side (`app/register/page.jsx`, instant feedback) and
  server-side (`app/api/auth/register/route.js`, checks the Firebase-verified
  `decoded.email`, not a client-supplied value — defense in depth).
- **Loan eligibility raised from 3 to 12 installments**: schema default
  changed (`Settings.minInstallmentsForLoan @default(12)`), `prisma/seed.js`
  updated, AND the **live Settings row was manually UPDATEd** (schema
  defaults only apply to new rows, not existing ones — ran
  `UPDATE settings SET "minInstallmentsForLoan" = 12 WHERE id = 1` via Neon
  psql). All hardcoded "3 paid installments" UI copy updated too
  (`app/page.jsx`, `components/PlanCard.jsx`). Still admin-configurable via
  `/admin/settings` if this needs to change again later.
- **Admin can now permanently delete a member account** — `DELETE
  /api/admin/members/[id]` (in `app/api/admin/members/[id]/route.js`):
  deletes the Firebase Auth user, then the Prisma `User` row, which now
  **cascades** (new migration `20260830225510_cascade_delete_member_data`
  added `onDelete: Cascade` to every child relation — installments,
  payments, loan requests, loan repayments, transactions — pointing back to
  `User`). Guards: can't delete your own admin account, can't delete another
  `ADMIN` role account from this screen. UI
  (`app/admin/members/[id]/page.jsx`) requires typing the exact MemberID
  into a `Modal` before the "Permanently Delete" button enables — tested
  live end-to-end (created a throwaway member, deleted it, confirmed via a
  direct DB query that the row and all its cascaded children were gone).
- **"Home" link added** to `Navbar`'s public variant (`components/Navbar.jsx`
  — new `PUBLIC_LINKS` array) — this is what was missing on `/login` in the
  user's screenshot; now shows on every public-variant page including the
  landing page itself.
- **3D/interactive landing page additions**: `components/TiltCard.jsx` (pure
  CSS mouse-tracking 3D tilt via `perspective`/`rotateX`/`rotateY`, no
  library) wraps `PlanCard` and the feature cards. Three decorative floating
  "badge" cards added to the hero (`animate-float` keyframe in
  `tailwind.config.js`, `hidden lg:flex` so they don't clutter mobile) —
  had to reposition one of them mid-session because it initially overlapped
  the hero heading text, caught by actually looking at the screenshot, not
  assumed correct from the code.
- **Mobile-responsive**: no NEW code changes beyond what redesign already
  had (mobile-first Tailwind classes throughout, `lg:hidden` hamburger nav,
  `overflow-x-auto` tables, decorative floats hidden below `lg:`). Could NOT
  visually verify at a narrow viewport this session either — `resize_window`
  still doesn't affect the automation screenshot's captured dimensions in
  this environment (tried 4 times across two sessions now, always returns
  1366px-wide screenshots regardless of requested size). Did a static grep
  audit instead (no fixed-pixel-width containers found). **If revisiting:
  don't retry resize_window — it's a confirmed environment limitation, not
  worth more attempts. Verify mobile on an actual device/DevTools instead.**

## Status: Contact support + Urdu/RTL (this session)

User asked for a specific phone number (+92 313 5448309) added as "contact
support," a Urdu language option, and then to deploy. Contact support and
Urdu are done; Vercel deploy status is unclear (user hasn't confirmed they
completed the dashboard import) — ask before assuming it's live.

- **Contact support**: `components/SupportButton.jsx` (new) — a global
  floating WhatsApp-style button (bottom-right, every page, mounted in
  `app/layout.jsx`) that expands to show the phone number with WhatsApp
  (`wa.me/923135448309`) and Call (`tel:+923135448309`) links. Also added
  a plain-text contact line to the landing page footer.
- **Urdu / RTL**: real i18n added, not a token gesture.
  - `lib/translations.js` — flat dictionary, `{ en: {...}, ur: {...} }`,
    grouped by page (`nav`, `landing`, `login`, `adminLogin`, `register`,
    `support`).
  - `context/LanguageContext.jsx` — `lang` state persisted to
    `localStorage`, `t(path)` lookup helper, and on every change sets
    `document.documentElement.lang`/`.dir` directly (`dir="rtl"` for Urdu)
    — this is what makes the whole page mirror automatically, no per-page
    layout work needed beyond translating text.
  - `app/layout.jsx` loads a second font, `Noto Nastaliq Urdu` (via
    `next/font/google`, `--font-urdu` CSS var), switched in via
    `html[lang="ur"] body` in `globals.css` — renders properly (verified
    visually, not just "should work").
  - Language toggle button (اردو ⇄ English) added to `Navbar` — present on
    every page since Navbar is universal.
  - **Translated pages**: Navbar labels, landing page (hero, how-it-works,
    plans section headers, features, CTA, footer), `/login`, `/admin/login`,
    `/register` (including the post-registration success screen). This is
    the FULL scope translated — member/admin dashboard pages, API error
    messages, and report data remain English-only. Told the user this
    limitation explicitly rather than implying full-app translation.
  - **Real bug found and fixed during live testing**: the phone number
    `+92 313 5448309` rendered visually reversed/garbled when embedded in
    Urdu (RTL) text — the Unicode bidi algorithm reorders LTR numeric runs
    unpredictably inside an RTL context. Fixed by wrapping phone-number
    text in `<span dir="ltr">`/`dir="ltr"` on the container in both
    `app/page.jsx`'s footer and `SupportButton.jsx`. This is the standard
    fix for embedding LTR content (phone numbers, emails, URLs) in RTL
    text — **remember this pattern if more contact info gets added to
    Urdu-translated pages later.**
  - Verified live in a real browser: toggled EN→UR→EN on landing/login/
    register, confirmed RTL mirroring (nav, hero, "How it works" grid
    order, arrow icon directions via `rtl:rotate-180`), confirmed the
    support popup renders and translates, confirmed language persists
    across page navigation (localStorage).

## Status: Vercel is live and verified (this session)

Deployed at **https://alqaim-fund.vercel.app/** — user confirmed they did
the import themselves. Ran a real smoke test against the production URL
(not just assumed it worked because the user said so):
- Landing page renders correctly, including the full redesign +
  contact-support widget + Urdu toggle, and shows the current
  "12-month cycle" copy — confirms Vercel is serving the latest deploy,
  not a stale cached build.
- Plans load from the live Neon DB via `/api/plans` (auto-deploy +
  `prisma migrate deploy` in the build step both confirmed working).
- Found the user's own real member account (USR002, logged in on
  production already) — confirms Firebase Auth's authorized-domains step
  was already done correctly (login would hard-fail with an
  `auth/unauthorized-domain` error otherwise), and that registration works
  live end-to-end, not just on localhost.
- Logged into `/admin/login` with the real admin credentials, confirmed
  `/admin` overview and `/admin/members` both show numbers that exactly
  match what we verified earlier in the local/Neon testing (2 members,
  Rs. 12,000 collected, 1 active loan, Rs. 16,000 outstanding) — this
  confirms production and local dev are pointed at the **same** Neon
  database (by design, not a bug — there's only one database for this
  project). Logged back out afterward, made no data changes.
- Did NOT test the full write-path (submit a real payment/loan on
  production) to avoid adding more noise to real data — read-only checks
  were sufficient to confirm the deployment is healthy.

## Status: Ledger integrity bug fixed (this session)

User reported via a production admin-panel screenshot: a member on Plan B
(Rs. 3,000/mo) paid Rs. 2,000, but the transaction ledger showed Rs. 3,000
paid. Confirmed via direct Neon psql query this was a real data bug, not a
display bug — `payments.amount=2000` but `transactions.amount=3000` for the
same event (transaction id=7, installment id=13, member USR002).

- **Root cause**: `lib/payments.js`'s `applyApprovedPayment` built the
  ledger `Transaction` row (and the plan/loan-repayment split) from
  `installment.amount` — the *scheduled* due amount — instead of the
  `amount` parameter actually passed in, i.e. what was *really* paid. This
  was invisible on the auto-verify path (member upload) because that path
  requires an exact amount match before calling the function at all — but
  it silently broke the ledger any time an admin approved a mismatched
  PENDING payment, or used "Add Payment Manually" with an amount that
  didn't match what was due. `user.totalPaid` was always correct (it
  increments by the real `amount`); only the ledger and the installment
  record were wrong. **This is the kind of bug to watch for again**: any
  future payment-adjacent code must derive amounts from what was actually
  received, never from what was scheduled/expected.
- **Fix** (`lib/payments.js`): splits the real `amount` between the
  plan-due portion (`Math.min(amount, installment.amount)`) and the
  loan-repayment portion, and uses that real split for both the ledger
  entry and the installment's new `amountPaid` field — never assumes a match.
- **Schema**: added `Installment.amountPaid` (migration
  `20260831004258_track_amount_paid_on_installments`) so a short payment
  stays visible everywhere, not just reconstructable from the ledger.
- **Preventative UI** (not just a silent fix): admin payment queue
  (`app/admin/payments/page.jsx`) now shows a "Due" column with an amber
  warning icon when a pending payment doesn't match what's due, and the
  "Add Payment Manually" form checks the due amount on blur of the Member
  ID field. Both the queue-approve action and the manual-entry submit now
  open a confirmation `Modal` ("Amount doesn't match what's due — Approve
  Anyway / Record Anyway") before committing a mismatched amount — added
  via `getDueAmount()` in `lib/payments.js`, exposed through
  `GET /api/admin/payments` (both the pending-list and a `?memberId=`
  single-lookup mode).
- **Transparency for the shortfall**: both `app/admin/members/[id]/page.jsx`
  (admin ledger view) and `app/member/dashboard/page.jsx` (member's own
  view) now show an amber "⚠ Rs. X (Rs. Y short)" / "⚠ Only Rs. X received"
  line on any installment where `amountPaid < amount`.
- **Data correction**: the specific bad record the user flagged was
  corrected directly via Neon psql (`UPDATE transactions SET amount=2000,
  "balanceAfter"=2000 WHERE id=7; UPDATE installments SET
  "amountPaid"=2000 WHERE id=13`) — confirmed via SELECT before and after.
- **Verified live** (local dev against the same production Neon DB): admin
  member ledger page for USR002 now shows the corrected Rs. 2,000/Rs. 2,000
  in the ledger and the shortfall warning on the installment; used the
  real "Add Payment Manually" form to enter a deliberately mismatched
  amount (USR002, Rs. 2,500 against a Rs. 3,000 due) and confirmed the new
  "Amount doesn't match what's due" modal fires correctly and Cancel
  aborts cleanly with no data written.
- Committed (`5a67395`) and pushed to `main` — Vercel will redeploy and run
  `prisma migrate deploy` automatically (idempotent, since the migration
  was already applied directly to the same Neon DB during this fix).

**Follow-up (same session, caught by the user immediately after the first
fix via a fresh screenshot):** the ledger row was fixed, but the admin
overview's "Collection This Month" stat card and the collection Excel/JSON
report still showed Rs. 3,000 — same root bug, two more places.
`app/api/admin/stats/route.js` was summing `installment.amount` +
`installment.loanDeduction` (scheduled amounts) instead of real money
received; `app/api/admin/reports/route.js`'s "collection" report only had
a "Plan Amount" column, no paid-amount column at all. Fixed both:
- **Stats**: `collectionThisMonth` now sums the `Transaction` ledger
  (`direction=OUT`, category `INSTALLMENT_PAYMENT`/`LOAN_REPAYMENT`, this
  calendar month) — the ledger is the real source of truth for money
  actually collected, and is correct post-fix.
- **Report**: collection report/export now shows "Plan Amount Due",
  "Amount Actually Paid", and "Shortfall" columns side by side.
- **Backfill migration** (`20260831010442_backfill_installment_amount_paid`):
  historical PAID installments had `amountPaid = NULL` (the field didn't
  exist yet when they were paid) — backfilled by joining each installment
  to its `INSTALLMENT_PAYMENT` transaction and copying that (now-correct)
  amount across, so old data reports consistently too, not just new data.
- Verified live: admin overview now shows Rs. 2,000 Collection This Month;
  collection report shows Due 3000 / Paid 2000 / Shortfall 1000 for the
  one real PAID installment in the DB (USR002, installment #1).
- Committed (`c94a500`) and pushed.
- **Lesson for next time**: when a "due vs. actually paid" bug is found in
  one place, grep for every other place that reads `installment.amount`
  or `installment.loanDeduction` as if it were the received amount — this
  bug existed in three separate call sites (the ledger writer, the stats
  aggregate, and the report) and was only caught in the second and third
  because the user kept checking after the first fix, not because a
  systematic sweep was done up front. Do the sweep up front next time a
  similar bug class is found.

## Status: Rebrand to AGS Fund + payment/Firebase bug fixes (this session)

User reported four things from live screenshots in one message: rebrand,
payments auto-verifying with no way to review them, screenshots not showing
in admin, and a "email already in use" error after deleting an account.

- **Rebrand**: "Alqaim Fund" → "**AGS Fund**" in `app/layout.jsx` (metadata
  title), `app/page.jsx` (footer), `components/Navbar.jsx` (logo text),
  `README.md`. Did NOT touch internal/non-user-facing identifiers
  (`package.json` name, `ADMIN_SEED_EMAIL` default `admin@alqaimfund.local`,
  Neon/GitHub project names) — those are infra labels, not brand text.
- **Removed payment auto-verification entirely** (this was the real root
  cause of both the "why is it verified automatically" complaint AND the
  "payments/screenshots not showing in admin" complaint — auto-approved
  payments never entered the `PENDING` queue the admin payments page reads,
  so their screenshots were invisible there by design, not a bug in the
  admin page itself). `app/api/member/payments/route.js` POST now always
  creates the payment as `status: "PENDING"` and returns "Payment uploaded —
  pending admin verification." unconditionally. Removed the now-dead
  `passesAutoVerification()` from `lib/payments.js`. Every member upload
  (with its screenshot/proofUrl) now always lands in `/admin/payments` for
  the admin to approve/reject — verified the admin page's existing
  PENDING-status query + proof "View" link already handle this correctly,
  no admin-side UI changes were needed.
- **Fixed a real orphaned-Firebase-account bug** behind the
  `auth/email-already-in-use` error: `app/register/page.jsx` calls
  `createUserWithEmailAndPassword` client-side BEFORE `/api/auth/register`
  creates the matching Prisma `User` row. If that API call fails for ANY
  reason (invalid plan, duplicate CNIC/`P2002`, any DB error), the Firebase
  Auth user was never rolled back — permanently orphaned (no Prisma row, so
  never visible/deletable from the admin panel) and the email stuck on
  `auth/email-already-in-use` forever. This was NOT actually about the
  admin delete-account feature (that already correctly calls
  `adminAuth.deleteUser` — see the "Registration/eligibility/delete-account"
  session below) — it was a failed *registration* attempt that left a
  stray Firebase user with no way to clean it up.
  - **Fix** (`app/api/auth/register/route.js`): if the Prisma `User` row is
    never created (invalid plan, or any error inside the `$transaction`),
    the just-created Firebase user is now deleted before returning the
    error. Once the Prisma row DOES exist, a later failure (setting the
    role claim, sending the MemberID notification) no longer deletes the
    Firebase user — that would orphan a *valid* member record instead
    (those two calls are now in their own try/catch that just logs).
  - **Also hardened** `app/api/admin/members/[id]/route.js` DELETE: it used
    to swallow ALL Firebase `deleteUser` errors with a warning and delete
    the DB row anyway. Now only `auth/user-not-found` is treated as
    harmless — any other Firebase error aborts the delete and returns it to
    the admin (502), so the DB row and the Firebase user can never
    silently drift apart again the way they did before.
  - **Cleaned up the specific stuck account** the user hit
    (`beeb93918@gmail.com`) via a one-off script (confirmed it was a real
    orphan — Firebase user existed, no matching Prisma row — before
    deleting): that email is free to register again now.
- **Logout and forgot-password**: logout already existed (`Navbar.jsx`,
  shown whenever `firebaseUser` is set, both member and admin variants) —
  no change needed, just confirmed. **Added forgot-password** (new, wasn't
  there before): a "Forgot password?" link + `Modal` on both `/login` and
  `/admin/login` that looks up the email via the existing
  `/api/auth/lookup?loginId=` endpoint, then calls Firebase's
  `sendPasswordResetEmail` — same "MemberID first, email under the hood"
  pattern the rest of auth uses. Always shows the same generic success
  message regardless of whether the account exists (don't leak which
  MemberIDs are real). Added `login.forgotPassword`/`resetTitle`/etc. and
  `adminLogin.*` equivalents to `lib/translations.js` (both `en` and `ur`).
- Verified: `next build` clean (33 routes), then a real `next dev` smoke
  test — confirmed "AGS Fund" renders on the homepage with zero remaining
  "Alqaim Fund" text, and "Forgot password" renders on both `/login` and
  `/admin/login`. Did not live-test the full payment-upload → admin-approve
  round trip this session (would need a real member session + Cloudinary
  upload) — logic-level fix is straightforward and build-verified, but
  worth a real end-to-end pass if anything looks off after deploy.
- Not yet committed/pushed — ask the user before pushing, per past sessions'
  pattern of confirming before Vercel-triggering pushes.

## Status: Member ID remember/recovery (this session)

User asked whether a member could be helped to remember their Member ID
(they log in with MemberID, not email, so browser username-autofill wasn't
obviously wired up) and whether autofill was possible — agreed to build
both a device-autofill fix and a real "forgot my Member ID" recovery flow.

- **Autofill fixes**: added `name`/`autoComplete` attributes to the
  actual login-identifier fields site-wide — `autoComplete="username"` +
  `autoComplete="current-password"` on both `/login` and `/admin/login`;
  `autoComplete="username email"` / `"new-password"` / `"name"` / `"tel"` /
  `"street-address"` on the `/register` form fields. This is what lets
  Chrome/Safari/etc. actually offer to save+autofill the MemberID the same
  way they do for any other site.
- **Device-remembered MemberID** (`app/login/page.jsx`): on successful
  login, the MemberID is saved to `localStorage` under `ags_last_member_id`
  and pre-fills the field on next visit — a fallback for whenever the
  browser's own password manager doesn't catch it (private browsing,
  autofill declined, etc). Also set immediately after a successful
  registration (`app/register/page.jsx`) so it's pre-filled the very first
  time they go to log in. Wrapped in try/catch — `localStorage` can throw
  in some browser privacy modes, and this is a pure convenience, never
  worth failing login/register over.
- **Real "Forgot your Member ID?" recovery** — new public endpoint
  `POST /api/auth/recover-memberid` (`{cnic, phone}` → `{memberId}`).
  **Important constraint that shaped the design**: there is NO live
  email/SMS provider wired up (`lib/notify.js` is still a stub — see
  "WHAT'S NEXT" below), so this can't email/text the result the way
  password-reset does. Instead it requires BOTH the CNIC and phone number
  on file to match before revealing the MemberID directly in the JSON
  response — two factors together are what makes this safe enough to
  return synchronously without a provider (a single field, e.g. phone
  alone, would let someone enumerate/probe for accounts). A "Forgot your
  Member ID?" link + `Modal` on `/login` (next to "Forgot password?") asks
  for CNIC (auto-dash via `formatCnic`) + phone, calls the endpoint, and
  shows the MemberID on screen on match. **If a real email/SMS provider
  gets wired up later, revisit this — emailing the result instead of
  displaying it on-screen would be strictly more secure once that's
  possible.**
- Verified live against the real Neon DB via `next dev`: fetched a real
  member's CNIC+phone (read-only, no writes) and confirmed the endpoint
  returns their correct MemberID; confirmed a non-matching pair returns the
  generic "not found" error. `next build` clean (34 routes, includes the
  new API route). Not yet committed/pushed as of writing this entry — see
  whether the same message below still says so.

## Status: Add-new-plan admin feature (this session)

User asked for an "add new plan" option in admin settings, plus the ability
to "change the maturity amount" of a plan. Asked a clarifying question on
the latter since it's not an existing field name anywhere in the schema —
user confirmed **"maturity amount" = the Monthly Amount**, which was
already editable in the existing Plan Amounts section of
`/admin/settings` (no new field/schema change needed for that half).

- **`POST /api/plans`** (new, admin-only, in `app/api/plans/route.js`):
  creates a new `Plan` row. Body: `{ name, monthlyAmount, tenureMonths?,
  maxLoanMultiplier? }` — `tenureMonths` defaults to
  `Settings.defaultTenureMonths`, `maxLoanMultiplier` defaults to the
  schema default (20) when omitted. The plan `code` (A/B/C/...) is
  auto-generated by `nextPlanCode()`, which scans existing codes and picks
  the first unused single letter — continues correctly past gaps left by
  a deleted plan, not just `count+1`.
  - **User confirmed**: new plans need to show up on the homepage too —
    already true with zero extra work, since `app/page.jsx` and
    `app/register/page.jsx` both fetch `/api/plans` dynamically rather
    than hardcoding Plan A/B/C. Verified this live (see below), not just
    assumed from reading the fetch call.
- **UI**: `app/admin/settings/page.jsx` — new "Add New Plan" form
  (`NewPlanForm`) below the existing per-plan edit rows. Same fields as
  the edit form (name, monthly amount, tenure, max loan multiplier), tenure/
  multiplier optional with placeholder text showing what default applies.
- **Verified live** against the real Neon DB (not just build-checked): used
  a one-off script to mint a real admin Firebase ID token (via
  `createCustomToken` + the Identity Toolkit REST
  `signInWithCustomToken` exchange — a reusable trick for testing
  admin-only endpoints from a script without knowing the admin's actual
  password), created a real throwaway "Plan TEST-DELETE-ME" via curl,
  confirmed it immediately appeared in `/api/plans` (the same endpoint the
  homepage/register page read), then deleted it by id and confirmed it was
  gone. No residue left in the real DB. `next build` clean throughout.
  Temp scripts (`get-admin-token.js`, `cleanup-test-plan.js`) were deleted
  after use — don't leave throwaway scripts in `scripts/`.
- Did NOT add a "delete plan" feature — not asked for, and it's more
  complex than it looks (`User.planId` points at `Plan`, no cascade
  defined for that direction, so deleting a plan with members already on
  it would need real thought about what happens to them — punt until
  actually requested).

## Status: Payment history + automated monthly emailed report (this session)

User asked for (1) a way to see a member's full history in admin, including
screenshots, surviving past approval, and (2) an automated monthly Excel
export "with pictures" delivered without the admin asking. Explained the
real constraints first (Firebase can't tell us when a password is
changed; no web app can literally push a file onto someone's device) and
let the user choose scope via AskUserQuestion rather than guessing:
**payment-history section now** (not a full activity-log table),
**skip password-change tracking**, **email the monthly report** (not
Cloudinary-archive or Google Drive), **embed the actual screenshots in the
spreadsheet** (not just a data-only export).

- **Payment History section** (`app/admin/members/[id]/page.jsx`): new
  `Section` rendering `member.payments` (was already fetched by
  `GET /api/admin/members/[id]` but never displayed) — date, amount,
  transaction ID, status, reject reason, and a "View" link to the
  screenshot. Zero schema/API changes needed, this data already existed.
- **`Settings.reportRecipientEmail`** (new nullable field, migration
  `20260906091342_add_report_recipient_email`) — deliberately separate
  from any admin's Firebase login email, since `ADMIN_SEED_EMAIL` is a
  synthetic placeholder (`admin@alqaimfund.local`), not necessarily a real
  inbox. Editable via a new "Monthly Payments Report" card on
  `/admin/settings`, which also has a **"Send Test Report Now"** button so
  this can be verified without waiting for the 1st of the month.
- **`lib/email.js`** — real email sending via Resend's HTTP API (no SDK
  dependency, just `fetch`). Gated behind `RESEND_API_KEY`/
  `RESEND_FROM_EMAIL` exactly like `lib/notify.js`'s SMS gate: logs and
  no-ops until those are actually set. **This is a genuinely new external
  dependency the user needs to set up themselves** — sign up at
  resend.com (free tier), verify a sending domain or use their sandbox
  sender (`onboarding@resend.dev`) for testing, create an API key, add
  both env vars locally AND in Vercel's project settings. Nothing will
  actually send until this is done — documented directly in
  `.env.example` and in the Settings page copy.
- **`lib/monthlyReport.js`** — `previousMonthRange()` (UTC-based, same
  date discipline as `lib/dueDate.js`) and `buildMonthlyPaymentsWorkbook`,
  which queries `Payment` rows `APPROVED` with `paymentDate` in that
  range and builds an ExcelJS workbook with each row's screenshot
  **embedded as an actual image** (fetches the Cloudinary URL, detects
  extension from the URL, `workbook.addImage`/`sheet.addImage` anchored to
  that row) — falls back to a "View (PDF)" hyperlink for non-image proofs
  (a loan doc could be a PDF), and to a "View (embed failed)" hyperlink if
  the fetch/embed throws, so one bad image never breaks the whole report.
- **`GET /api/cron/monthly-report`** (new route) — accepts either a Vercel
  Cron request (`Authorization: Bearer <CRON_SECRET>`, Vercel's documented
  pattern for securing cron endpoints) or a normal admin Firebase Bearer
  token (so the Settings page's test button can hit the same route).
  Optional `?month=YYYY-MM` override for testing against a month that
  actually has data — the real cron call never passes this, always uses
  last calendar month.
- **`vercel.json`** (new) — `crons: [{ path: "/api/cron/monthly-report",
  schedule: "0 6 1 * *" }]` — 06:00 UTC on the 1st of every month. Well
  within Vercel Hobby-plan cron limits (low frequency, one job).
- **Verified live** against the real Neon DB + real Cloudinary screenshot
  (not just build-checked): hit the route locally with `?month=2026-08`
  before any recipient email was set — correctly returned "no
  reportRecipientEmail set" without crashing. Temporarily set a real
  `reportRecipientEmail` via the settings API, re-ran for `2026-09` (a
  month with a real approved payment that has a real Cloudinary
  screenshot) — got back `{"sent":false,"reason":"not_configured",
  "count":3}` (correct, since `RESEND_API_KEY` isn't set locally), and
  confirmed via the dev server log that NO "failed to embed" warning was
  logged for that payment — i.e. the screenshot fetch+embed genuinely
  succeeded, not just "didn't crash." Reverted `reportRecipientEmail` back
  to `null` afterward so no test artifact was left in the real settings
  row. `next build` clean (35 routes).
- **Still needed before this actually emails anything in production**:
  the user needs to (1) sign up for Resend and add `RESEND_API_KEY` +
  `RESEND_FROM_EMAIL` to Vercel's env vars, (2) set `CRON_SECRET` in
  Vercel too (any random string), (3) set a real `reportRecipientEmail` in
  `/admin/settings`. None of this can be done on the user's behalf — it
  requires their own Resend account.
- **Deliberately NOT built** (per the user's own choice in
  AskUserQuestion): a general activity-log table (logins, profile edits,
  suspend/reactivate) and password-change tracking (would need replacing
  Firebase's hosted reset page with a custom one). Revisit only if asked.

## Status: Fixed a plan/member mismatch caused by editing a live plan in place (this session)

User reported (via screenshots) that a member (USR013) saw "Plan A — Rs.
1,000/mo" and a wrong "Total Remaining" on their dashboard, even though
they'd actually signed up and paid under the original Plan A rate of
Rs. 2,000/mo. Traced it to a real root cause, not random corruption.

- **Root cause**: when the admin added the "Plan 0 (no refund)" plan
  (Rs. 1,000/mo) using the "Add New Plan" feature from the previous
  session, they didn't use that form — they instead **edited the existing
  "Plan A" row in place** (via the per-plan "Save" button in the Plan
  Amounts section) to rename it to "Plan 0(no refund)" and drop its
  `monthlyAmount` to 1000. Then, to restore Plan A/B/C, they used "Add New
  Plan" to create fresh rows named "Plan A" (2000), "Plan B" (3000), "Plan
  C" (5000) — which got NEW plan ids or reused freed ones, auto-assigned
  new codes. Every existing member's `User.planId` foreign key still
  pointed at the OLD plan ids, which now had different names/amounts than
  when those members joined — so their dashboard (`plan.name` +
  `plan.monthlyAmount`, both read live via `GET /api/member/overview`) and
  "Total Remaining" (`plan.monthlyAmount * plan.tenureMonths -
  user.totalPaid`, also both live) started showing the wrong numbers,
  even though every actually-money-relevant field (`Installment.amount`,
  `amountPaid`, the ledger `Transaction` rows, `user.totalPaid`) was
  **completely untouched and correct** the whole time — this was a
  display/lookup bug from a stale foreign key, never a real financial data
  loss.
- **Diagnosis method**: read-only dump of every `Plan` row and every
  member's `planId` + first `Installment.amount` (the frozen snapshot from
  registration — ground truth for what they actually agreed to). Found
  `Installment.amount` for every member exactly matched what a plan named
  "A"/"B"/"C" was correctly priced at ORIGINALLY (2000/3000/5000) — proving
  the members' real obligations were fine and only the FK link was stale.
  One member (USR014) had genuinely registered mid-shuffle and was already
  internally consistent — correctly left untouched.
- **Fix**: reassigned `User.planId` for the 9 affected members
  (USR004,005,006,007,008,010,011,012,013) to whichever CURRENT plan row's
  name+amount actually matches their frozen installment amount — a pure
  foreign-key correction, zero changes to any installment, payment,
  transaction, or plan row itself. Verified afterward with a script
  comparing every member's live plan amount against their frozen
  installment amount — **0 mismatches remain**.
- **Known harmless side effect**: plan `code` values (A/B/C/D) no longer
  line up alphabetically with plan `name` in a tidy way (e.g. the plan
  named "Plan B" now has `code="C"`) — `code` isn't rendered anywhere in
  the UI (checked), so this is cosmetic-only in raw DB dumps, not worth
  fixing unless it starts mattering somewhere.
- **Lesson for next time, and worth telling the user directly**: the
  per-plan "Save" button in `/admin/settings` edits that exact plan row
  **in place** and immediately changes what EVERY member currently on that
  plan sees and owes going forward for any NEW installment schedule built
  from it — it is not a safe way to introduce a new plan. Use "Add New
  Plan" for anything meant to be a distinct new plan; only use the
  per-plan edit form to correct a genuine mistake in an EXISTING plan
  that no one should have been paying differently for.

## Status: Admin can edit member details, members can edit their own name (this session)

Straightforward feature add after the plan-mismatch fix — no schema
changes, both fields already existed on `User`.

- **Admin**: `PATCH /api/admin/members/[id]` now also accepts `name` and
  `cnic` (previously only `status`/`phone`/`address`) — validates CNIC
  format via `lib/validators.isValidCnic`, returns a clear 409 on a
  duplicate-CNIC conflict (`P2002`) instead of a generic 500. New "Edit"
  button + `Modal` on `/admin/members/[id]` (next to Suspend/Delete) with
  Name/CNIC/Phone/Address fields, CNIC auto-formatted with dashes via the
  same `formatCnic` used at registration.
- **Member**: `PATCH /api/member/profile` now also accepts `name`. Added a
  "Full Name" field to the existing "Contact Details" card on
  `/member/profile`, above Phone/Address. **Deliberately did not** add
  CNIC editing on the member side — that's an identity document, kept
  admin-only on purpose.
- Neither endpoint touches Firebase (name/CNIC aren't Firebase Auth
  fields — only email/password are), so no Firebase Admin SDK calls
  needed here, unlike the delete-account or register flows.
- **Verified live** against the real Neon DB (not just build-checked):
  used the same real-Firebase-custom-token trick as prior sessions to hit
  both endpoints as a real admin AND as a real member (USR014), for both
  the admin-edit and self-edit paths — confirmed each write applied, then
  reverted the test member's name back to its original value immediately
  after. `next build` clean (35 routes, no new routes — just PATCH body
  changes on two existing ones).

## Status: Donate button on the landing page (this session)

User wants anonymous (non-member) visitors to be able to support the fund
too — asked for a "Donate" button on the home page with specific
registration+payment instructions they pasted in Urdu.

- New pink/rose "Donate" button in the hero CTA row (`app/page.jsx`,
  alongside "View Plans"/"Member Login") opens a `Modal` with: the 3-step
  instructions (register → deposit chosen plan's amount → send receipt),
  a JazzCash/EasyPaisa block (Rafaqat Hussain, 0313-5448309), a Bank Al
  Habib block (account name + IBAN `PK88BAHL5798008100010601` with a
  one-click **Copy** button), and a "Send Receipt on WhatsApp" button
  that deep-links to `wa.me/923135448309` (same phone, reformatted to
  international — reused the existing `SUPPORT_WHATSAPP` conversion
  pattern already used for the contact-support widget).
- **Content is exactly what the user provided**, not reinterpreted —
  didn't try to distinguish "anonymous donation" from "member
  registration+payment" even though the copy talks about registering
  first; that's the org's actual process for handling any contribution,
  not something to second-guess.
- Added a `donate` namespace to `lib/translations.js` for both `en`/`ur` —
  the Urdu text is the user's exact wording; English is a natural
  translation, not literal word-for-word. Phone numbers/IBAN/account name
  stay identical in both languages (they're data, not prose) — wrapped in
  `dir="ltr"` spans, same Unicode-bidi fix already established for phone
  numbers in RTL context (see the Urdu/RTL session below).
- **Verified live in a real browser** (not just build-checked): opened the
  modal in English (renders correctly, WhatsApp/copy buttons present),
  switched to Urdu and reopened it — confirmed full RTL mirroring
  including the numbered list correctly right-aligning its markers.
  `next build` clean (35 routes, no new routes — this is landing-page-only,
  no backend involved).

## Status: Donations record, manual Charges, Terms & Conditions gate (this session)

Three features requested together. Clarified the money-affecting one via
AskUserQuestion before touching anything — user's answer: it's a MANUAL
admin action (not automatic on first payment), it must NOT change the
member's actual paid/owed totals, and the member should see a note about
it — which directly shaped the design below.

- **Donations**: new `Donation` model (donorName, donorPhone, amount,
  transactionId?, proofUrl?) — deliberately NOT linked to `User`, since
  donors don't need an account. `POST /api/donations` is public (no auth)
  — the landing page's "Donate" modal now has a real submission form
  (name/phone/amount/transaction ID/screenshot via the existing
  `FileDropzone` + Cloudinary `donation_proofs` folder) below the existing
  payment instructions. `GET /api/admin/donations` (admin-only) backs a
  new `/admin/donations` page listing every donation with its screenshot.
- **Charges** (the manual-deduction feature): new `Charge` model (userId,
  amount, reason?) + new `TransactionCategory.CHARGE_DEDUCTION`. Admin
  triggers it from a member's own page (`/admin/members/[id]` — new
  "Deduct Charge" button/modal, amount + optional reason, free-form
  amount, NOT hardcoded to 50% — that was the original ask but the user's
  clarification dropped the fixed-percentage idea in favor of admin
  typing whatever amount). **Critically**: `POST
  /api/admin/members/[id]/charges` does NOT touch `user.totalPaid` or any
  `Installment` — it only creates the `Charge` row and appends a
  `CHARGE_DEDUCTION` Transaction ledger entry (`direction: OUT`,
  description "Charges deducted: <reason>"). That Transaction is what
  satisfies "notify the member" — it already shows up on their own
  `/member/transactions` page with a clear description, no new
  notification system needed. New `/admin/charges` page lists every
  charge fund-wide (across all members); the member detail page also
  shows that one member's own Charges section inline. Both `charges` and
  `donations` nav links added to the admin Navbar.
- **Terms & Conditions gate**: new `User.termsAcceptedAt DateTime?`
  (nullable — existing members are NOT retroactively forced to accept,
  per "when a person **now** registers"). `lib/termsAndConditions.js`
  holds the full 16-clause text the user provided — content is unchanged
  in substance; the only edit was adding an explicit acceptance
  preamble/closing (the actual legal mechanism a click-to-accept flow
  needs, which was structurally the one thing missing). Shared
  `components/TermsContent.jsx` renders it, reused by both the
  registration gate and a new standalone `/terms` page (linked from the
  landing page footer). `app/register/page.jsx`'s success flow now has
  TWO stages: right after `createUserWithEmailAndPassword` +
  `/api/auth/register` succeed, a mandatory `if (success &&
  !termsConfirmed)` screen shows the full text + a checkbox + "I Agree &
  Continue" (disabled until checked) — only after `POST
  /api/auth/accept-terms` succeeds does the familiar "Welcome
  aboard, your Member ID is X" screen appear. New public endpoint
  requires a real Firebase ID token (the client is already signed in at
  this point from `createUserWithEmailAndPassword`, so this works
  without any new auth plumbing).
- **Verified thoroughly against the real Neon DB** (every write reverted
  or deleted afterward, no test data left behind): submitted a real test
  donation via curl and confirmed it appeared in the admin donations API,
  then deleted it; deducted a real test charge on a real member (USR014)
  and confirmed BOTH that it showed up correctly in `/admin/charges` +
  that member's transactions AND that `totalPaid`/`paidInstallments`/every
  installment stayed completely untouched, then deleted the Charge and
  its Transaction row; called accept-terms as a real member token and
  confirmed `termsAcceptedAt` was set, then reverted it to null. Then ran
  the FULL real flow through an actual browser (not just API calls):
  registered a genuine throwaway account end-to-end, watched the T&C gate
  correctly block with the button disabled until the checkbox was ticked,
  confirmed acceptance recorded in the DB, then fully deleted that test
  account (Firebase + DB cascade) via the existing admin delete endpoint.
  `next build` clean throughout (42 routes, 9 new).

## Status: New contact number, member Support page, single-user WhatsApp reminder (this session)

User asked for a bulk WhatsApp broadcast feature ("send to a single user or
all users, one click"). Explained honestly before building anything: a
single-user pre-filled `wa.me` link is trivially possible right now (admin
still clicks Send inside WhatsApp), but a true one-click bulk broadcast to
ALL users with zero manual steps needs a real WhatsApp Business API
integration (Meta Business verification, a dedicated API-only phone
number, message template pre-approval, per-message cost) — a much bigger
external-setup project than anything built so far, not something doable
today. User chose: do the single-user version now, skip the bulk one.

- **Contact/WhatsApp/Call number changed to 03075941906** everywhere it's
  used as a *contact* number — `components/SupportButton.jsx`,
  `app/page.jsx`'s `SUPPORT_*` constants, and the Donate modal's "send us
  your receipt" number. **Deliberately left unchanged**: the actual
  JazzCash/EasyPaisa payment account number (`0313-5448309`, Rafaqat
  Hussain's own account) — user was explicit these are two different
  things now, only the contact/WhatsApp number moved.
- **New `lib/validators.js` helper**: `toWhatsAppNumber(phone)` —
  normalizes a local Pakistani number (any format: dashes, leading 0, etc.)
  to wa.me's international format. Replaced the inline
  `.replace(/\D/g,"").replace(/^0/,"92")` duplicated twice in
  `app/page.jsx` with this, and reused it for the new WhatsApp reminder
  buttons below.
- **New `/member/support` page** — payment details (JazzCash/EasyPaisa +
  Bank Al Habib, reusing the `donate.*` translation keys already built for
  the Donate modal) plus the full Terms & Conditions embedded via the
  existing `TermsContent` component, all in one place a logged-in member
  can always get back to. Added to `MEMBER_LINKS` in `Navbar.jsx` (new
  "Support" tab, `nav.support` translation key both languages).
- **Single-user WhatsApp reminder**: new `lib/whatsappTemplates.js` holds
  `ACCOUNT_ACTIVATION_REMINDER_UR` — the exact Urdu payment-reminder
  message the user provided verbatim (no phone number embedded in the
  message itself, so no translation/number-swap ambiguity there). A
  "WhatsApp Reminder" button on `/admin/members/[id]` and a compact
  "Remind" link per-row on the `/admin/members` list both open
  `wa.me/<member's own phone, normalized>?text=<the message>` in a new
  tab — admin reviews and hits Send inside WhatsApp themselves.
- **Verified live in a real browser** (not just build-checked): opened the
  Donate modal and confirmed the receipt number shows the NEW number while
  JazzCash still shows the OLD number side by side; opened the
  SupportButton widget and confirmed the new number there too; registered
  a real throwaway test account, went through the T&C gate, and confirmed
  `/member/support` renders both the payment details (old JazzCash number
  correctly preserved) and the full Terms & Conditions text correctly —
  then fully deleted that test account (Firebase + DB cascade) afterward.
  `next build` clean (43 routes, one new page).

## Status: Fixed the Charges balance-check gap; explained the installment date "skip" (this session)

User found a real hole by testing it themselves: created a throwaway
member (USR015) who never selected/paid for anything (totalPaid = 0), and
was still able to deduct a Rs. 350 "charge" from them via the admin UI —
exactly the "fool proof" gap they asked to close. Also asked whether a
visually odd installment schedule (jumping from 1/30/2027 straight to
3/1/2027, no February date at all) was a date-logic bug.

- **Installment date "skip" — verified NOT a bug**: `computeDueDateForMonth`
  (`lib/dueDate.js`) rolls a Sunday due date to the next day. Feb 28, 2027
  is genuinely a Sunday, and 2027 isn't a leap year (no Feb 29) — so
  `Date.UTC(2027, 1, 29)` legitimately overflows to March 1, 2027, same as
  real-calendar Monday-after-Sunday-Feb-28 would. Confirmed with a direct
  `getUTCDay()` check before answering, not assumed. This is a rare,
  correct edge case (only occurs when a non-leap Feb 28, or a leap Feb 29,
  lands on Sunday) — not a data or timezone bug like the earlier one this
  project already found and fixed. Left as-is; flagged to the user as
  "correct but rare-looking," not changed since no alternative rule was
  requested.
- **Charges balance-check gap — real bug, fixed**:
  `POST /api/admin/members/[id]/charges` previously had NO check against
  the member's actual balance — any positive amount was accepted
  regardless of `totalPaid`. Fixed: computes
  `availableBalance = totalPaid - sum(existing charges)` and rejects with
  a clear error (naming the member, the attempted amount, and the actual
  available balance) if the new charge would exceed it. The admin UI
  (`/admin/members/[id]`'s Deduct Charge modal) now also shows this
  available balance up front, sets `max` on the amount input, and disables
  the Deduct button client-side when over — the server-side check is the
  real guard, the UI just avoids a round-trip for the obvious case.
- **Verified against the exact real scenario** (not a synthetic
  reproduction): confirmed USR015 genuinely had `totalPaid: "0"` with the
  bogus Rs. 350 charge still in place, attempted another charge and
  confirmed it was correctly rejected (even correctly reported a negative
  available balance while the bad charge was still present), then
  reverted that original invalid charge (deleted the `Charge` row + its
  `CHARGE_DEDUCTION` `Transaction` row) now that it's proven invalid under
  the new rule, and re-confirmed a fresh Rs. 1 attempt is still correctly
  blocked at Rs. 0 available. `next build` clean, no new routes (just
  hardening two existing files).

## Status: Donation purpose, homepage gallery, scrolling donations banner (this session)

User asked for three homepage/donation features in one message: (1) a
donation-purpose selector (Sadqa, Khums, General Fund,
Youm-e-Inhadam-e-Jannat-ul-Baqi) saved to the DB and visible to admin, (2) a
homepage Gallery section admin can add/remove photos to via Cloudinary, (3)
a right-to-left scrolling banner (like e-commerce "sale live" tickers)
showing real donations. Asked two clarifying questions up front: purpose as
single-choice vs multi-select checkboxes (**user chose single-choice**,
confirming it should be saved to the DB and shown in admin), and whether the
ticker should show real donor names or anonymize them (**user chose real
names**).

- **Schema** (migration `20260921085139_add_donation_purpose_and_gallery`,
  applied to the real Neon DB): added `enum DonationPurpose` (`SADQA`,
  `KHUMS`, `GENERAL_FUND`, `YOUM_E_INHADAM_E_JANNAT_UL_BAQI`) and
  `Donation.purpose` (`@default(GENERAL_FUND)` so the 2 pre-existing
  donation rows didn't break). New `GalleryImage` model (`imageUrl`,
  `caption?`, `createdAt`) — deliberately not linked to a `User`, admin-only
  content.
- **`lib/donationPurposes.js`** (new) — the single source of truth for the
  4 purposes (`DONATION_PURPOSES` array with en/ur labels) and
  `donationPurposeLabel(purpose, lang)`, used by the landing page selector,
  the admin donations table, and the donations Excel report.
- **Donate form** (`app/page.jsx`): added a required styled radio-pill
  group (4 options, single choice — not literal checkboxes, per the user's
  explicit choice) between Amount and Transaction ID. `POST /api/donations`
  now rejects any submission without a valid `purpose` (400).
- **Admin visibility**: `/admin/donations` (Pending + All tables) and the
  donations Excel/JSON report (`/api/admin/reports?type=donations`) both
  gained a Purpose column via the same `donationPurposeLabel` helper.
- **Public donations ticker**: `GET /api/donations` (new on the existing
  route file) returns only the latest 20 **APPROVED** donations, and only
  `donorName`/`amount`/`purpose`/`createdAt` — never phone or proof, and
  never PENDING/REJECTED ones. `components/DonationTicker.jsx` (new)
  consumes it, renders a `dir="ltr"`-forced (so it always scrolls the same
  way regardless of the Urdu/RTL toggle) CSS marquee — `tailwind.config.js`
  gained a `marquee` keyframe/animation (`translateX(0)` → `translateX(-50%)`
  over a doubled item list for a seamless loop). Falls back to a generic
  "donate today" message (translated) when there are zero approved
  donations yet, so the banner is never empty/broken on a fresh install.
  Mounted at the very top of `app/page.jsx`, above `<Navbar>` (scrolls away
  normally; the sticky navbar then sticks right below where it was).
- **Gallery — admin CRUD**: `GET/POST /api/admin/gallery` (list + add,
  admin-only) and `DELETE /api/admin/gallery/[id]` (admin-only). New
  `app/admin/gallery/page.jsx` — `FileDropzone` + optional caption,
  `uploadToCloudinary(file, "gallery")` then POST the resulting URL (the
  established pattern — Cloudinary upload always happens client-side, the
  API only ever stores a URL). Delete goes through a `Modal` confirmation
  (not a raw click) since it's an irreversible admin action, consistent
  with how reject/delete flows are handled elsewhere in this app. Added
  "Gallery" to `ADMIN_LINKS` in `Navbar.jsx` (new `Images` icon) +
  `nav.gallery` translation.
- **Gallery — public homepage section**: `GET /api/gallery` (new, public,
  no auth) — all photos, newest first. `app/page.jsx` fetches it on mount
  and renders an "Our Activities" grid section between Plans and Features
  — **the section renders nothing at all if there are zero photos** (not an
  empty placeholder), so a fresh install with no photos yet looks
  intentional, not broken.
- **Verified live end-to-end against the real Neon DB** (not just
  build-checked): started `next dev`, used the same
  real-Firebase-custom-token-exchange trick as prior sessions (temp script,
  deleted after use — see that pattern in earlier entries if reused again)
  to get a real admin ID token, then via curl: submitted a real donation
  with `purpose=SADQA` (confirmed 400 on missing/invalid purpose), approved
  it as admin, confirmed it appeared correctly in the public ticker endpoint
  with only the expected fields; added a real gallery photo as admin,
  confirmed it appeared on the public `/api/gallery`, confirmed a
  no-token POST to the admin gallery endpoint correctly 401s, then deleted
  it and confirmed the public list emptied again. Cleaned up all test rows
  afterward (deleted the test donation directly via Prisma — there's
  deliberately no donation-delete API, financial records aren't meant to
  be deletable from the UI). `next build` clean (all routes, including the
  3 new ones). `curl`'d both `/` and `/admin/gallery` against the running
  dev server and grepped its log for errors — none found.
- Browser-based visual verification (screenshots) was **not** done this
  session — the Claude-in-Chrome extension reported "not connected" when
  attempted. Everything was verified via real HTTP calls against the real
  DB instead (stronger than a build check, but not a substitute for
  actually looking at the rendered page) — worth a real visual pass next
  time the browser extension is available, especially the marquee's scroll
  speed/spacing and the gallery grid's responsive layout.
- Not yet committed/pushed — ask the user before pushing, per the
  established pattern in this project.

## Status: WHAT'S NEXT

1. Decide what to do with accumulated test data (USR001, USR002 — the
   latter looks like the user's own manual testing, garbage placeholder
   name — plus a rejected MODALTEST01 payment) before real launch — ask
   the user, don't just delete it. The admin delete-account feature makes
   this easy to do from the UI whenever they're ready.
3. Translate the remaining pages (member dashboard, admin panel) into Urdu
   if the user wants full-app coverage — the `lib/translations.js` +
   `useLanguage()` pattern is already established, it's just more entries.
4. SMS provider for MemberID notification — stubbed behind
   `Settings.smsEnabled`, no provider wired up (`lib/notify.js`).
5. Admin login currently uses `ADMIN_SEED_EMAIL` (default
   `admin@alqaimfund.local`) as a placeholder Firebase email — fine as-is,
   just flagging it's synthetic, not a real inbox.
6. Real mobile-viewport check (phone or browser DevTools, not this
   automation environment) still outstanding — see note above.

## Known rough edges / things to double check when revisiting

- `app/api/admin/loans` PATCH approve spreads the repayment schedule across
  whatever `PENDING` installments currently exist for the member — if a
  member is near the end of their cycle there may be fewer installments left
  than the chosen tenure; the code clamps to however many exist rather than
  creating new ones. Revisit if that's not the desired behavior.
- No pagination anywhere yet (admin members list caps at 200, reports have
  none) — fine for an MVP, would need it at real scale.
- Running `next build` while `next dev` is also running against the same
  `.next` directory corrupts the dev server's cache (`Cannot find module
  './276.js'` style errors) — always stop the dev server first, or use a
  separate working copy, before running a production build for verification.
  This happened again this session (twice) — killing stray `node.exe`
  processes matching `*Alqaim Fund*` in their command line cleans it up;
  `TaskStop` on the harness-tracked task doesn't always kill the actual
  underlying `next dev` process tree on Windows, so stray processes can pile
  up across sessions — worth a quick `Get-CimInstance Win32_Process` check
  at the start of any session that's about to run `next dev`.
