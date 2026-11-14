# Headline URLs

Published and scheduled articles receive a stable, unique `slug` in Postgres.
English headline words are preferred when available; Punjabi/Hindi text is converted to English/Roman letters with a local transliteration and common-news-word dictionary. No translation API key is required. Apply `roman-headline-slugs.sql` after `seo-slugs.sql`. Previous native-script slugs are retained in `slug_aliases`, served by generated alias pages and redirected by the reader. Nine significant words maximum, hyphen separated. Headline changes preserve existing URLs. Existing row-level access controls are unchanged.

`python scripts/build_news_pages.py` fetches **only** the public `published_stories` RPC using the existing publishable key, then builds real HTML article paths, canonical metadata, NewsArticle structured data, a route map and sitemap. Fetch failures abort without deleting previous pages. Curated source briefs retain source attribution and illustrative-image labels.

The `Publish readable news URLs` workflow polls every five minutes (GitHub scheduling may be delayed), commits changed generated files and explicitly requests a Pages build. New published links can render immediately through the custom 404 reader until the static file deploys; during this interval the response is HTTP 404/noindex. After deployment it is an ordinary HTTP 200 article. GitHub Pages does not provide a server-side 301 for old query URLs: the reader redirects them in JavaScript. Scheduled articles enter the static pages only when due. Unpublished pages are removed on the next successful build.

The remaining site-wide SEO and performance audit is separate work.
