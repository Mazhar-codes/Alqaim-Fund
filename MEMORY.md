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
