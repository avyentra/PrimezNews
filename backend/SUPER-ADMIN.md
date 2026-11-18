# Super Admin (owner panel) — setup

Page: `superadmin.html` (link: `/superadmin`). Only the owner (super admin) can open it.
The newsroom (`admin.html`), journalist dashboard and the public website keep working exactly as before.

## One-time setup (Supabase → SQL Editor)

1. Open `backend/super-admin.sql`, copy everything, paste in SQL Editor, **Run**.
   (Needs the old files already run: schema, article-views, site-visitors, journalist-applications, journalist-dashboard.)
2. Owner account: Supabase → Authentication → Users → make sure the owner's email exists and is confirmed.
3. In the **STEP 2** block at the bottom of `super-admin.sql`, replace `OWNER_EMAIL_HERE` with the owner's email
   and run only that block. The owner becomes super admin + newsroom admin.
4. GIF ads: run `backend/ad-gif-upload.sql` once (allows animated GIF up to 3 MB in the ads bucket).
5. Optional User ID login: in `assets/js/backend-config.js` add the alias, e.g.
   `usernames: { gurlal: 'manu.innn@gmail.com', mangat: 'OWNER_EMAIL' }`.

After this, the owner signs in on `/login` and lands on `/superadmin` automatically.
If STEP 2 is not done yet, login keeps working as before (owner goes to the newsroom).

## What each part does

| Section | Real data from | Notes |
|---|---|---|
| Overview | `super_admin_overview()` | Website views (+1 on every page open), new visitors, article reads, online now (last 5 min). Refreshes every 30 s. |
| Earnings | `earnings` table | Add DIPR / AdSense / local-ad payments. Monthly target is a private setting. |
| Ads & DIPR | `advertisements`, `ad_campaigns` | Upload JPG/PNG/WebP (auto-compressed) or GIF, link, pause, remove. Campaigns + "Record payment". |
| Team & roles | `super_admin_team()`, `super_admin_set_role()` | Roles: Admin (stories + approvals), Editor (stories), Journalist, Blocked. Approve join requests after viewing proof. |
| Pages & settings | `site_settings` | Hide menu items, ticker on/off, journalist sign-ups on/off, visitor notice strip. Website applies them within ~5 minutes. |
| Audit log | `audit_log` | Every role, setting, earning and campaign change. |

## Notes
- Views history starts from the day `super-admin.sql` is run (older days were never stored per day).
  All-time totals include everything counted before.
- The public footer can show a higher "launch" number (existing behaviour). The Super Admin shows the real counts.
- New people cannot be created from the website (that needs a secret key). They apply at `join-newsroom`
  or you create them in Supabase → Authentication; then give them a role in Team & roles.
- Everything is protected in the database (row-level security + checks inside each function),
  so a newsroom admin or journalist cannot open owner data even if they open the page.
