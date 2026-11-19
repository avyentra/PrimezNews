# PrimezNews RSS Automation (Merged Setup Guide)

This RSS module integrates directly into your existing **Supabase + GitHub Pages** newsroom without altering any existing pages, RLS rules, market-rate scripts, or static page builders.

## How It Connects to Your Existing System
1. `scripts/fetch_rss_news.py` reads approved RSS feeds, detects Punjab districts automatically, deduplicates via `external_guid`, and optionally rewrites items into clean Punjabi/English summaries using Gemini.
2. Stories are inserted into your existing `public.stories` table:
   - By default (`RSS_AUTO_PUBLISH=false`), new items arrive as **Drafts** in `admin.html` so you can review/publish them safely.
   - When you set GitHub Repository Variable `RSS_AUTO_PUBLISH=true`, they publish immediately and trigger your existing `story_slug` and `instant-news-pages` pipeline.

## One-Time Setup
1. **Supabase SQL Editor:** Run `backend/rss-ingestion.sql` once.
2. **GitHub Repository Secrets** (`Settings -> Secrets and variables -> Actions`):
   - `SUPABASE_SERVICE_KEY`: Your Supabase `service_role` secret key (never put this in frontend JS).
   - `GEMINI_API_KEY`: Optional Gemini API key for Punjabi/English rewriting (if omitted, clean feed summaries are saved as-is).
   - `SUPABASE_URL`: Optional (defaults automatically to the URL in `assets/js/backend-config.js`).
3. **Optional Auto-Publish Toggle:** In `Settings -> Secrets and variables -> Actions -> Variables`, add `RSS_AUTO_PUBLISH` = `true` (or keep `false` for draft review).
