# Primez cloud newsroom — GitHub Pages + Supabase

## What is implemented

- `login.html`: email/password login, show password, email recovery; no open signup.
- `admin.html`: editor-only cloud story CRUD, uploads, private preview, backup export,
  explicit import of old browser drafts, ads, sign out, responsive layout.
- `news.html`: real published articles; existing homepage gains a live stories section.
- Postgres row-level security blocks anonymous writes and future/draft reads.
- Scheduling uses `publish_at <= now()` enforced by Postgres: no browser tab,
  cron job or GitHub Action must remain open for access to become available.
  Already-open feeds refresh each minute; fresh reads see due articles immediately.
- Existing static/sample homepage sections remain design previews. They are NOT
  silently imported or published as verified news.

## One-time configuration (project owner)

1. Create a Supabase project. Run `backend/schema.sql` once in SQL Editor.
   The migration is transactional; do not rerun after a successful install.
2. In Authentication settings disable new user signups. Set Site URL to
   `https://avyentra.github.io/PrimezNews/` and add exact redirect URL
   `https://avyentra.github.io/PrimezNews/reset-password.html`.
3. Create an editor in Authentication → Users using your own email and a strong
   password. Confirm the email. Do not commit or share the password.
4. Grant newsroom membership by running in the SQL Editor:
   ```sql
   insert into public.newsroom_editors(user_id)
   select id from auth.users where email = 'YOUR_EDITOR_EMAIL';
   ```
   Only the project owner can grant membership; ordinary users cannot self-assign.
5. In `assets/js/backend-config.js` set `url` to your project URL and `publicKey`
   to the PUBLIC publishable key (or legacy anon key). These are intentionally
   public; authorization is in RLS. Never use service_role/secret keys here.
6. Commit the files to the repository branch used by GitHub Pages. No build step.
7. Open `/PrimezNews/login.html`, sign in, create a draft, Preview, then publish.
   Verify `/PrimezNews/news.html` in a signed-out/incognito window.
8. Test scheduling with an IST time a few minutes ahead: it must be absent
   before its due time and visible after. The database stores UTC; the editor
   explicitly converts Asia/Kolkata input, independent of the device timezone.

## Operational details

- Draft text is private. Uploaded media is in a PUBLIC bucket for news assets:
  do not upload embargoed/confidential media until ready for public access.
- Browser drafts are never auto-published; imports are always database drafts.
- Password reset email delivery depends on Supabase Auth mail configuration.
  Configure SMTP for your deployment and verify delivery/rate limits yourself.
- The client SDK is pinned to Supabase JS 2.49.8 on jsDelivr; internet/CDN access
  is required. Session tokens are managed by the SDK, no credentials in source.
- The project owner should keep database backups and configure account recovery.
- This change does not configure or activate any rashifal automation.

## Verification

Run `node --test tests/newsroom.test.cjs` and
`node --check assets/js/cloud-dashboard.js`.
These local tests cover integration contracts and validation. They do not
substitute for running the SQL and real Auth/RLS tests against your project.
See `backend/security-tests.sql` for SQL-level permission checks.

## User ID sign-in

Email sign-in is supported. To enable User ID `Gurlal`, set
`usernames.gurlal` in backend-config.js to the confirmed editor email.
Aliases and their email addresses are public configuration; never put passwords
in this file. Create/set the password in Supabase Authentication, not GitHub.
The alias does not bypass editor membership or password checks.
