"""Automated RSS news ingestion for PrimezNews.
Reads approved Punjab/India RSS feeds, deduplicates via external_guid, optionally rewrites
into concise Punjabi/English summaries via Gemini API, and inserts directly into public.stories
so existing triggers (slugs, instant-news-pages, published_stories RPC) work automatically.

Insert strategy (robust against PostgREST 400s):
  * plain POST /rest/v1/stories, NO `on_conflict` (a partial unique index on external_guid cannot be
    used as an ON CONFLICT target, which is what used to cause HTTP 400);
  * `Prefer: resolution=ignore-duplicates,return=minimal`;
  * deterministic primary key `id = rss-<hash>` so duplicates are ignored even without optional columns;
  * if the optional RSS columns are missing / not in the schema cache, retry with core columns only;
  * after the run, rows are read back from Supabase to verify they really exist.
"""
import hashlib
import html
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Approved public RSS feeds (add or customize URLs as needed)
RSS_FEEDS = [
    {
        "name": "Google News Punjab",
        "url": "https://news.google.com/rss/search?q=Punjab+news+Chandigarh+Mohali&hl=en-IN&gl=IN&ceid=IN:en",
        "category": "Punjab",
        "default_district": "Chandigarh",
        "image": "city",
    },
    {
        "name": "Google News Chandigarh & Tricity",
        "url": "https://news.google.com/rss/search?q=Chandigarh+Mohali+Panchkula+news&hl=en-IN&gl=IN&ceid=IN:en",
        "category": "Punjab",
        "default_district": "SAS Nagar (Mohali)",
        "image": "city",
    },
    {
        "name": "Google News Punjab Agriculture",
        "url": "https://news.google.com/rss/search?q=Punjab+agriculture+farming+MSP+crop&hl=en-IN&gl=IN&ceid=IN:en",
        "category": "Agriculture",
        "default_district": "Ludhiana",
        "image": "fields",
    },
]

DISTRICT_KEYWORDS = {
    "Amritsar": ["amritsar", "ਅੰਮ੍ਰਿਤਸਰ", "अमृतसर"],
    "Barnala": ["barnala", "ਬਰਨਾਲਾ", "बरनाला"],
    "Bathinda": ["bathinda", "ਬਠਿੰਡਾ", "बठिंडा"],
    "Faridkot": ["faridkot", "ਫ਼ਰੀਦਕੋਟ", "फरीदकोट"],
    "Fatehgarh Sahib": ["fatehgarh", "ਫ਼ਤਹਿਗੜ੍ਹ", "फतेहगढ़"],
    "Fazilka": ["fazilka", "abohar", "ਫ਼ਾਜ਼ਿਲਕਾ", "ਅਬੋਹਰ", "फाजिल्का"],
    "Ferozepur": ["ferozepur", "firozpur", "ਫ਼ਿਰੋਜ਼ਪੁਰ", "फिरोजपुर"],
    "Gurdaspur": ["gurdaspur", "batala", "ਗੁਰਦਾਸਪੁਰ", "गुरदासपुर"],
    "Hoshiarpur": ["hoshiarpur", "ਹੁਸ਼ਿਆਰਪੁਰ", "होशियारपुर"],
    "Jalandhar": ["jalandhar", "ਜਲੰਧਰ", "जालंधर"],
    "Kapurthala": ["kapurthala", "phagwara", "ਕਪੂਰਥਲਾ", "कपूरथला"],
    "Ludhiana": ["ludhiana", "khanna", "ਲੁਧਿਆਣਾ", "लुधियाना"],
    "Malerkotla": ["malerkotla", "ਮਲੇਰਕੋਟਲਾ", "मलेरकोटला"],
    "Mansa": ["mansa", "ਮਾਨਸਾ", "मानसा"],
    "Moga": ["moga", "ਮੋਗਾ", "मोगा"],
    "Sri Muktsar Sahib": ["muktsar", "gidderbaha", "ਮੁਕਤਸਰ", "ਗਿੱਦੜਬਾਹਾ", "मुक्तसर"],
    "Pathankot": ["pathankot", "ਪਠਾਨਕੋਟ", "पठानकोट"],
    "Patiala": ["patiala", "rajpura", "ਪਟਿਆਲਾ", "पटियाला"],
    "Rupnagar": ["rupnagar", "ropar", "ਰੂਪਨਗਰ", "रोपड़"],
    "SAS Nagar (Mohali)": ["mohali", "sas nagar", "kharar", "zirakpur", "ਮੋਹਾਲੀ", "मोहाली"],
    "Sangrur": ["sangrur", "ਸੰਗਰੂਰ", "संगरूर"],
    "SBS Nagar": ["sbs nagar", "nawanshahr", "ਨਵਾਂਸ਼ਹਿਰ", "नवांशहर"],
    "Tarn Taran": ["tarn taran", "ਤਰਨ ਤਾਰਨ", "तरनतारन"],
    "Chandigarh": ["chandigarh", "ਚੰਡੀਗੜ੍ਹ", "चंडीगढ़"],
}


def load_supabase_url() -> str:
    env_url = os.environ.get("SUPABASE_URL", "").strip()
    if env_url:
        return env_url.rstrip("/")
    cfg = (ROOT / "assets/js/backend-config.js").read_text(encoding="utf-8")
    m = re.search(r"url:\s*'([^']+)'", cfg)
    if not m:
        raise RuntimeError("Supabase URL not found in env or assets/js/backend-config.js")
    return m.group(1).rstrip("/")


def clean_html(raw: str) -> str:
    text = re.sub(r"<[^>]+>", " ", raw or "")
    text = html.unescape(text)
    return " ".join(text.split()).strip()


def detect_district(text: str, default_district: str) -> str:
    low = text.lower()
    for district, keys in DISTRICT_KEYWORDS.items():
        if any(k in low for k in keys):
            return district
    return default_district


def parse_feed(xml_bytes: bytes, feed_cfg: dict) -> list[dict]:
    root = ET.fromstring(xml_bytes)
    items = []
    # Support RSS 2.0 (<item>) and Atom (<entry>)
    nodes = root.findall(".//item") or root.findall(".//{http://www.w3.org/2005/Atom}entry")
    for node in nodes[:12]:
        title = clean_html(
            (node.findtext("title") or node.findtext("{http://www.w3.org/2005/Atom}title") or "")
        )
        link = (node.findtext("link") or "").strip()
        if not link:
            atom_link = node.find("{http://www.w3.org/2005/Atom}link")
            if atom_link is not None:
                link = (atom_link.attrib.get("href") or "").strip()
        guid = (
            node.findtext("guid")
            or node.findtext("{http://www.w3.org/2005/Atom}id")
            or link
            or title
        ).strip()
        desc = clean_html(
            node.findtext("description")
            or node.findtext("{http://www.w3.org/2005/Atom}summary")
            or ""
        )
        if not title or not link:
            continue
        guid_hash = hashlib.sha256(guid.encode("utf-8")).hexdigest()[:32]
        district = detect_district(f"{title} {desc}", feed_cfg["default_district"])
        items.append(
            {
                "external_guid": f"rss_{guid_hash}",
                "title": title[:480],
                "en": title[:480],
                "summary": (desc or title)[:2800],
                "link": link,
                "source_name": feed_cfg["name"],
                "category": feed_cfg["category"],
                "district": district,
                "image": feed_cfg["image"],
            }
        )
    return items


def rewrite_with_gemini(item: dict, api_key: str) -> dict:
    if not api_key:
        return {
            "title": item["title"],
            "en": item["en"],
            "summary": item["summary"],
            "body": f"{item['summary']}\n\nSource: {item['source_name']} ({item['link']})",
        }

    prompt = (
        "You are an editorial desk assistant for PrimezNews (Punjab regional digital news). "
        "Rewrite the news brief below into neutral, factual, original Punjabi (Gurmukhi) and concise English. "
        "Do not copy sentences verbatim; keep all names, numbers, and facts accurate; never invent details. "
        'Return ONLY valid JSON with keys: "pa_title", "en_title", "pa_summary", "pa_body".\n'
        f"Source: {item['source_name']}\n"
        f"District: {item['district']}\n"
        f"Headline: {item['title']}\n"
        f"Details: {item['summary']}"
    )
    endpoint = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.5-flash:generateContent?key={urllib.parse.quote(api_key)}"
    )
    payload = json.dumps(
        {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json"},
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        endpoint, data=payload, headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=35) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")[:400]
        raise RuntimeError(f"Gemini HTTP {exc.code} {exc.reason}: {detail}") from exc
    text = raw["candidates"][0]["content"]["parts"][0]["text"]
    parsed = json.loads(text)
    pa_title = (parsed.get("pa_title") or item["title"]).strip()[:480]
    en_title = (parsed.get("en_title") or item["en"]).strip()[:480]
    pa_summary = (parsed.get("pa_summary") or item["summary"]).strip()[:2800]
    pa_body = (parsed.get("pa_body") or pa_summary).strip()
    attribution = f"\n\nਸਰੋਤ / Source: {item['source_name']} ({item['link']})"
    return {
        "title": pa_title,
        "en": en_title,
        "summary": pa_summary,
        "body": (pa_body + attribution)[:95000],
    }


def _auth_headers(service_key: str) -> dict:
    """New-style `sb_secret_...` keys are not JWTs and must be sent in `apikey` only."""
    headers = {"apikey": service_key}
    if not service_key.startswith("sb_"):
        headers["Authorization"] = f"Bearer {service_key}"
    return headers


def rest_request(method: str, url: str, service_key: str, body=None, prefer: str | None = None):
    """Returns (status, text). Never raises for HTTP errors, so callers can log the response body."""
    headers = _auth_headers(service_key)
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")
    if prefer:
        headers["Prefer"] = prefer
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, resp.read().decode("utf-8", errors="ignore")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", errors="ignore")


def norm_title(text: str) -> str:
    return " ".join((text or "").lower().split())[:200]


def fetch_existing(supabase_url: str, service_key: str) -> tuple[set[str], set[str], bool]:
    """Returns (existing guids, normalized existing titles, rss_columns_available)."""
    base = f"{supabase_url}/rest/v1/stories"
    status, text = rest_request(
        "GET", f"{base}?select=id,external_guid,title,en&order=updated_at.desc&limit=1000", service_key
    )
    has_cols = True
    if status == 400:
        print(f"[WARN] Optional RSS columns not readable (HTTP 400): {text[:300]}")
        print("[WARN] Run backend/rss-ingestion.sql in Supabase SQL Editor. Falling back to core columns.")
        has_cols = False
        status, text = rest_request("GET", f"{base}?select=id,title,en&order=updated_at.desc&limit=1000", service_key)
    if status != 200:
        raise RuntimeError(f"Cannot read public.stories (HTTP {status}): {text[:400]}")
    rows = json.loads(text or "[]")
    guids = {r["external_guid"] for r in rows if r.get("external_guid")}
    guids |= {r["id"] for r in rows if str(r.get("id", "")).startswith("rss-")}
    titles = {norm_title(r.get("title")) for r in rows} | {norm_title(r.get("en")) for r in rows}
    titles.discard("")
    return guids, titles, has_cols


OPTIONAL_COLUMNS = ("external_guid", "source_name", "source_url", "is_automated")


def insert_story(supabase_url: str, service_key: str, row: dict) -> str:
    """POST one story. Returns 'inserted', 'inserted-core' (optional columns dropped) or 'duplicate'.
    Raises RuntimeError (with the HTTP response body) on real failures."""
    url = f"{supabase_url}/rest/v1/stories"
    prefer = "resolution=ignore-duplicates,return=minimal"
    status, text = rest_request("POST", url, service_key, row, prefer)
    if status in (200, 201, 204):
        return "inserted"
    if status == 409:
        return "duplicate"
    # Optional columns missing / schema cache stale -> retry with core public.stories columns only.
    lowered = text.lower()
    if status == 400 and (
        "pgrst204" in lowered or "schema cache" in lowered or "column" in lowered or "42703" in lowered
    ):
        core = {k: v for k, v in row.items() if k not in OPTIONAL_COLUMNS}
        print(f"[WARN] HTTP 400 with optional columns ({text[:200]}); retrying with core columns only.")
        status2, text2 = rest_request("POST", url, service_key, core, prefer)
        if status2 in (200, 201, 204):
            return "inserted-core"
        if status2 == 409:
            return "duplicate"
        raise RuntimeError(f"HTTP {status2}: {text2[:600]}")
    raise RuntimeError(f"HTTP {status}: {text[:600]}")


def verify_inserted(supabase_url: str, service_key: str, ids: list[str]) -> set[str]:
    """Read the rows back so we only report what really exists in the database."""
    found: set[str] = set()
    for i in range(0, len(ids), 50):
        chunk = ids[i : i + 50]
        in_list = ",".join(urllib.parse.quote(x, safe="") for x in chunk)
        status, text = rest_request(
            "GET", f"{supabase_url}/rest/v1/stories?select=id,status&id=in.({in_list})", service_key
        )
        if status != 200:
            print(f"[WARN] Verification read failed (HTTP {status}): {text[:300]}")
            continue
        found |= {r["id"] for r in json.loads(text or "[]")}
    return found


def fallback_rewrite(item: dict) -> dict:
    return {
        "title": item["title"],
        "en": item["en"],
        "summary": item["summary"],
        "body": f"{item['summary']}\n\nSource: {item['source_name']} ({item['link']})",
    }


def main() -> int:
    service_key = os.environ.get("SUPABASE_SERVICE_KEY", "").strip()
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
    auto_publish = os.environ.get("RSS_AUTO_PUBLISH", "false").strip().lower() == "true"

    if not service_key:
        print("[WARN] SUPABASE_SERVICE_KEY is not set; skipping RSS sync cleanly.")
        return 0

    supabase_url = load_supabase_url()
    print(f"[INFO] Supabase: {supabase_url} · mode={'published' if auto_publish else 'draft'} · gemini={'on' if gemini_key else 'off'}")
    try:
        existing, existing_titles, has_cols = fetch_existing(supabase_url, service_key)
    except Exception as exc:
        print(f"[WARN] {exc}")
        return 1
    now_iso = datetime.now(timezone.utc).isoformat()
    attempted: list[str] = []
    inserted = skipped = failed = feeds_ok = 0

    for feed_cfg in RSS_FEEDS:
        try:
            req = urllib.request.Request(
                feed_cfg["url"],
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
                    "Accept": "application/rss+xml, application/xml, text/xml, */*",
                    "Accept-Language": "en-IN,en;q=0.9,pa;q=0.8",
                },
            )
            with urllib.request.urlopen(req, timeout=25) as resp:
                xml_data = resp.read()
            items = parse_feed(xml_data, feed_cfg)
            feeds_ok += 1
            print(f"[OK] Feed '{feed_cfg['name']}': {len(items)} items")
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="ignore")[:200]
            print(f"[WARN] Could not read feed {feed_cfg['name']}: HTTP {exc.code} {exc.reason} {body}")
            continue
        except Exception as exc:
            print(f"[WARN] Could not read feed {feed_cfg['name']}: {exc}")
            continue

        for item in items:
            row_id = item["external_guid"].replace("rss_", "rss-", 1)
            if item["external_guid"] in existing or row_id in existing or norm_title(item["title"]) in existing_titles:
                skipped += 1
                continue
            try:
                rewritten = rewrite_with_gemini(item, gemini_key)
            except Exception as exc:
                print(f"[WARN] Gemini rewrite fallback for '{item['title'][:70]}': {exc}")
                if "HTTP 4" in str(exc):
                    gemini_key = ""  # bad key / quota: stop calling Gemini for the rest of this run
                rewritten = fallback_rewrite(item)

            body = (rewritten["body"] or "").strip() or f"{item['title']}\n\nSource: {item['source_name']} ({item['link']})"
            story_row = {
                "id": row_id,
                "title": rewritten["title"][:500],
                "en": rewritten["en"][:500],
                "summary": (rewritten["summary"] or item["title"])[:3000],
                "body": body[:100000],
                "categories": [item["category"]],
                "category": item["category"],
                "district": item["district"],
                "author": f"RSS Desk · {item['source_name']}"[:200],
                "image": item["image"],
                "status": "published" if auto_publish else "draft",
                "publish_at": now_iso if auto_publish else None,
                "updated_at": now_iso,
                "external_guid": item["external_guid"],
                "source_name": item["source_name"],
                "source_url": item["link"],
                "is_automated": True,
            }
            try:
                result = insert_story(supabase_url, service_key, story_row)
            except Exception as exc:
                failed += 1
                print(f"[WARN] Failed inserting '{item['title'][:70]}': {exc}")
                continue
            existing.add(item["external_guid"])
            existing.add(row_id)
            existing_titles.add(norm_title(item["title"]))
            if result == "duplicate":
                skipped += 1
                print(f"[WARN] Duplicate ignored: {story_row['title'][:80]}")
                continue
            attempted.append(row_id)
            print(f"[OK] Sent ({story_row['status']}{', core columns' if result == 'inserted-core' else ''}): {story_row['title'][:90]}")

    verified = verify_inserted(supabase_url, service_key, attempted) if attempted else set()
    inserted = len(verified)
    missing = [i for i in attempted if i not in verified]
    if missing:
        print(f"[WARN] {len(missing)} row(s) were accepted by the API but NOT found afterwards: {missing[:5]}")
    print(
        f"RSS sync finished. New stories added: {inserted} · skipped (already present): {skipped} · "
        f"failed: {failed} (mode={'published' if auto_publish else 'draft'})"
    )
    if feeds_ok == 0:
        print("[WARN] No feed could be read.")
        return 1
    if failed and not inserted:
        return 1
    if attempted and not inserted:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
