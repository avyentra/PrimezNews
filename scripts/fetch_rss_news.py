"""Automated RSS news ingestion for PrimezNews.
Reads approved Punjab/India RSS feeds, deduplicates via external_guid, optionally rewrites
into concise Punjabi/English summaries via Gemini API, and inserts directly into public.stories
so existing triggers (slugs, instant-news-pages, published_stories RPC) work automatically.
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
        "name": "The Tribune Punjab",
        "url": "https://www.tribuneindia.com/rss/feed?catId=42",
        "category": "Punjab",
        "default_district": "Chandigarh",
        "image": "city",
    },
    {
        "name": "The Tribune Chandigarh",
        "url": "https://www.tribuneindia.com/rss/feed?catId=41",
        "category": "Punjab",
        "default_district": "Chandigarh",
        "image": "city",
    },
    {
        "name": "The Tribune Agriculture / Nation",
        "url": "https://www.tribuneindia.com/rss/feed?catId=50",
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
    with urllib.request.urlopen(req, timeout=35) as resp:
        raw = json.loads(resp.read().decode("utf-8"))
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


def fetch_existing_guids(supabase_url: str, service_key: str) -> set[str]:
    url = f"{supabase_url}/rest/v1/stories?select=external_guid&external_guid=not.is.null&limit=1000"
    req = urllib.request.Request(
        url,
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        rows = json.loads(resp.read().decode("utf-8"))
    return {r["external_guid"] for r in rows if r.get("external_guid")}


def insert_story(supabase_url: str, service_key: str, row: dict) -> None:
    url = f"{supabase_url}/rest/v1/stories?on_conflict=external_guid"
    req = urllib.request.Request(
        url,
        data=json.dumps(row).encode("utf-8"),
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=ignore-duplicates,return=minimal",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        resp.read()


def main() -> int:
    service_key = os.environ.get("SUPABASE_SERVICE_KEY", "").strip()
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
    auto_publish = os.environ.get("RSS_AUTO_PUBLISH", "false").strip().lower() == "true"

    if not service_key:
        print("SUPABASE_SERVICE_KEY is not set; skipping RSS sync cleanly.")
        return 0

    supabase_url = load_supabase_url()
    existing = fetch_existing_guids(supabase_url, service_key)
    now_iso = datetime.now(timezone.utc).isoformat()
    inserted = 0

    for feed_cfg in RSS_FEEDS:
        try:
            req = urllib.request.Request(
                feed_cfg["url"], headers={"User-Agent": "PrimezNews-RSS-Sync/1.0"}
            )
            with urllib.request.urlopen(req, timeout=25) as resp:
                xml_data = resp.read()
            items = parse_feed(xml_data, feed_cfg)
        except Exception as exc:
            print(f"[WARN] Could not read feed {feed_cfg['name']}: {exc}")
            continue

        for item in items:
            if item["external_guid"] in existing:
                continue
            try:
                rewritten = rewrite_with_gemini(item, gemini_key)
            except Exception as exc:
                print(f"[WARN] Gemini rewrite fallback for '{item['title']}': {exc}")
                rewritten = {
                    "title": item["title"],
                    "en": item["en"],
                    "summary": item["summary"],
                    "body": f"{item['summary']}\n\nSource: {item['source_name']} ({item['link']})",
                }

            story_row = {
                "title": rewritten["title"],
                "en": rewritten["en"],
                "summary": rewritten["summary"],
                "body": rewritten["body"],
                "categories": [item["category"]],
                "category": item["category"],
                "district": item["district"],
                "author": f"RSS Desk · {item['source_name']}",
                "image": item["image"],
                "status": "published" if auto_publish else "draft",
                "publish_at": now_iso if auto_publish else None,
                "external_guid": item["external_guid"],
                "source_name": item["source_name"],
                "source_url": item["link"],
                "is_automated": True,
            }
            try:
                insert_story(supabase_url, service_key, story_row)
                existing.add(item["external_guid"])
                inserted += 1
            except Exception as exc:
                print(f"[WARN] Failed inserting '{item['title']}': {exc}")

    print(f"RSS sync finished. New stories added: {inserted} (mode={'published' if auto_publish else 'draft'})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
