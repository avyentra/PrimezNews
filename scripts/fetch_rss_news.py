"""Automated RSS news ingestion for PrimezNews.
Reads approved Punjab/India RSS feeds, deduplicates via external_guid, optionally rewrites
into concise Punjabi/English summaries via Gemini API, and inserts directly into public.stories
so existing triggers (slugs, instant-news-pages, published_stories RPC) work automatically.

Article pipeline: Google News link -> real publisher URL -> readable article text (<= 4000 chars)
-> Gemini -> publish-ready Punjabi (Gurmukhi) article + English headline. If the publisher blocks us
or Gemini is unavailable, the RSS headline/summary is used instead (never an empty body).

Insert strategy (robust against PostgREST 400s):
  * plain POST /rest/v1/stories, NO `on_conflict` (a partial unique index on external_guid cannot be
    used as an ON CONFLICT target, which is what used to cause HTTP 400);
  * `Prefer: resolution=ignore-duplicates,return=minimal`;
  * deterministic primary key `id = rss-<hash>` so duplicates are ignored even without optional columns;
  * if the optional RSS columns are missing / not in the schema cache, retry with core columns only;
  * after the run, rows are read back from Supabase to verify they really exist.
"""
import base64
import email.utils
import hashlib
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEMINI_API_BASE = os.environ.get("GEMINI_API_BASE", "https://generativelanguage.googleapis.com").rstrip("/")
# Google retires models for new users from time to time (gemini-2.5-flash now returns 404), so we try a list.
# Override with the GEMINI_MODEL env var / repository variable if you want a specific model.
GEMINI_MODELS = [m for m in [os.environ.get("GEMINI_MODEL", "").strip(), "gemini-3.8-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"] if m]
_GEMINI = {"model": None, "thinking": True}
BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0.0.0 Safari/537.36"
)
MAX_SOURCE_CHARS = 4000

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
    {
        "name": "Google News NRI Punjabi",
        "url": "https://news.google.com/rss/search?q=Punjabi+NRI+Canada+UK+Australia+USA&hl=en-IN&gl=IN&ceid=IN:en",
        "category": "NRI",
        "default_district": "Chandigarh",
        "image": "people",
    },
    {
        "name": "Google News Visa & Immigration",
        "url": "https://news.google.com/rss/search?q=visa+immigration+Indians+Canada+UK+Australia+USA&hl=en-IN&gl=IN&ceid=IN:en",
        "category": "NRI",
        "default_district": "Chandigarh",
        "image": "people",
    },
    {
        "name": "Google News Passport & OCI",
        "url": "https://news.google.com/rss/search?q=Indian+passport+OCI+MEA+consular+NRI&hl=en-IN&gl=IN&ceid=IN:en",
        "category": "NRI",
        "default_district": "Chandigarh",
        "image": "people",
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


def parse_pub_date(node) -> datetime | None:
    """Item timestamp in UTC (RSS <pubDate>, Atom <published>/<updated>, <dc:date>); None if missing/unparseable."""
    for tag in ("pubDate", "{http://www.w3.org/2005/Atom}published", "{http://www.w3.org/2005/Atom}updated",
                "{http://purl.org/dc/elements/1.1/}date"):
        raw = (node.findtext(tag) or "").strip()
        if not raw:
            continue
        dt = None
        try:
            dt = email.utils.parsedate_to_datetime(raw)
        except Exception:
            try:
                dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            except Exception:
                dt = None
        if dt is not None:
            return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)
    return None


def max_age_hours() -> float:
    try:
        value = float(os.environ.get("RSS_MAX_AGE_HOURS", "2") or 2)
    except ValueError:
        value = 2.0
    return value if value > 0 else 2.0


def with_recency(url: str, hours: float) -> str:
    """Adds Google News' `when:Nh` operator to the search query (e.g. q=Punjab+news+when:4h)."""
    parts = urllib.parse.urlsplit(url)
    if "news.google.com" not in parts.netloc:
        return url
    query = urllib.parse.parse_qsl(parts.query, keep_blank_values=True)
    window = f"{int(-(-hours // 1))}h" if hours < 24 else f"{int(-(-hours // 24))}d"
    query = [(k, re.sub(r"\s*when:\S+", "", v) + f" when:{window}") if k == "q" else (k, v) for k, v in query]
    return urllib.parse.urlunsplit(parts._replace(query=urllib.parse.urlencode(query)))


def parse_feed(xml_bytes: bytes, feed_cfg: dict) -> list[dict]:
    root = ET.fromstring(xml_bytes)
    items = []
    # Support RSS 2.0 (<item>) and Atom (<entry>)
    nodes = root.findall(".//item") or root.findall(".//{http://www.w3.org/2005/Atom}entry")
    for node in nodes[:30]:
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
        if desc and norm_title(desc).startswith(norm_title(title)[:40]) and len(desc) < len(title) + 120:
            desc = ""  # Google News description is only the headline + publisher link
        publisher = clean_html(node.findtext("source") or "") or feed_cfg["name"]
        title = strip_publisher(title, publisher)
        guid_hash = hashlib.sha256(guid.encode("utf-8")).hexdigest()[:32]
        district = detect_district(f"{title} {desc}", feed_cfg["default_district"])
        items.append(
            {
                "external_guid": f"rss_{guid_hash}",
                "title": title[:480],
                "en": title[:480],
                "summary": (desc or title)[:2800],
                "link": link,
                "source_name": publisher,
                "category": feed_cfg["category"],
                "district": district,
                "image": feed_cfg["image"],
                "published": parse_pub_date(node),
            }
        )
    return items


def strip_publisher(title: str, publisher: str = "") -> str:
    """'Headline - Times of India' -> 'Headline'."""
    t = title.strip()
    if publisher and t.lower().endswith(" - " + publisher.lower()):
        return t[: -(len(publisher) + 3)].strip()
    m = re.match(r"^(.*\S)\s+[-\u2013\u2014|]\s+([^-\u2013\u2014|]{2,45})$", t)
    return m.group(1).strip() if m else t


# ---------------------------------------------------------------- Google News -> publisher URL
def _http_get(url: str, timeout: int = 20, max_bytes: int = 1_500_000):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": BROWSER_UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-IN,en;q=0.9",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read(max_bytes)
        charset = resp.headers.get_content_charset() or "utf-8"
        return resp.geturl(), raw.decode(charset, errors="replace")


def _google_article_id(link: str) -> str | None:
    u = urllib.parse.urlparse(link)
    parts = [p for p in u.path.split("/") if p]
    if u.hostname == "news.google.com" and len(parts) >= 2 and parts[-2] in ("articles", "read"):
        return parts[-1]
    return None


def _decode_legacy_google_id(gid: str) -> str | None:
    """Older Google News ids embed the publisher URL in plain base64."""
    try:
        data = base64.urlsafe_b64decode(gid + "=" * (-len(gid) % 4))
    except Exception:
        return None
    m = re.search(rb"https?://[\x21-\x7e]+", data)
    return m.group(0).decode("ascii", errors="ignore") if m else None


def _decode_google_id_online(gid: str) -> str | None:
    """Newer ids are encrypted; Google's own web app resolves them through batchexecute."""
    page = None
    for base in (f"https://news.google.com/rss/articles/{gid}", f"https://news.google.com/articles/{gid}"):
        try:
            _, page = _http_get(base, timeout=20)
        except Exception:
            continue
        sg = re.search(r'data-n-a-sg="([^"]+)"', page)
        ts = re.search(r'data-n-a-ts="([^"]+)"', page)
        if sg and ts:
            break
    else:
        return None
    sig, stamp = html.unescape(sg.group(1)), html.unescape(ts.group(1))
    inner = (
        '["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],'
        f'"X","X",1,[1,1,1],1,1,null,0,0,null,0],"{gid}",{stamp},"{sig}"]'
    )
    form = "f.req=" + urllib.parse.quote(json.dumps([[["Fbv4je", inner]]]))
    req = urllib.request.Request(
        "https://news.google.com/_/DotsSplashUi/data/batchexecute",
        data=form.encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", "User-Agent": BROWSER_UA},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        text = resp.read().decode("utf-8", errors="replace")
    for line in text.split("\n"):
        line = line.strip()
        if line.startswith("[["):
            try:
                return json.loads(json.loads(line)[0][2])[1]
            except Exception:
                continue
    m = re.search(r'garturlres\\",\\"(https?:[^"\\]+)', text)
    return m.group(1).replace("\\u003d", "=").replace("\\u0026", "&") if m else None


def resolve_article_url(link: str) -> str:
    """Returns the real publisher URL, or the original link when it cannot be resolved."""
    gid = _google_article_id(link)
    if not gid:
        return link
    for step in (_decode_legacy_google_id, _decode_google_id_online):
        try:
            url = step(gid)
        except Exception:
            url = None
        if url and "news.google.com" not in (urllib.parse.urlparse(url).hostname or ""):
            return url
    try:  # last resort: follow plain HTTP redirects
        final, _ = _http_get(link, timeout=15, max_bytes=2000)
        if "news.google.com" not in (urllib.parse.urlparse(final).hostname or ""):
            return final
    except Exception:
        pass
    return link


# ---------------------------------------------------------------- readable article text
class _ArticleParser(HTMLParser):
    SKIP = {"script", "style", "nav", "header", "footer", "aside", "form", "noscript", "svg", "iframe",
            "button", "select", "template", "figcaption"}
    JUNK = re.compile(
        r"(cookie|subscribe|sign in|log in|advertisement|all rights reserved|follow us|newsletter|"
        r"read more|click here|terms of use|privacy policy|whatsapp|copyright)", re.I)

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.article = 0
        self.buf: list[str] | None = None
        self.in_article: list[str] = []
        self.anywhere: list[str] = []
        self.meta = ""

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in self.SKIP:
            self.skip += 1
        elif tag == "article":
            self.article += 1
        elif tag == "p" and not self.skip:
            self.buf = []
        elif tag == "meta" and not self.meta:
            key = (a.get("property") or a.get("name") or "").lower()
            if key in ("og:description", "description", "twitter:description"):
                self.meta = clean_html(a.get("content") or "")

    def handle_endtag(self, tag):
        if tag in self.SKIP:
            self.skip = max(0, self.skip - 1)
        elif tag == "article":
            self.article = max(0, self.article - 1)
        elif tag == "p" and self.buf is not None:
            text = " ".join("".join(self.buf).split())
            self.buf = None
            if len(text) >= 50 and not self.JUNK.search(text):
                self.anywhere.append(text)
                if self.article:
                    self.in_article.append(text)

    def handle_data(self, data):
        if self.buf is not None and not self.skip:
            self.buf.append(data)


def extract_article_text(page_html: str, limit: int = MAX_SOURCE_CHARS) -> str:
    parser = _ArticleParser()
    try:
        parser.feed(page_html)
    except Exception:
        pass
    paras = parser.in_article if sum(map(len, parser.in_article)) >= 300 else parser.anywhere
    seen, out, total = set(), [], 0
    for p in paras:
        if p in seen:
            continue
        seen.add(p)
        if total + len(p) > limit and out:
            break
        out.append(p[:limit])
        total += len(p)
    text = "\n\n".join(out)
    if len(text) < 200 and parser.meta:
        text = (text + "\n\n" + parser.meta).strip()
    return text[:limit]


def fetch_source_text(link: str) -> tuple[str, str]:
    """Returns (publisher_url, article_text). Text is '' when the publisher blocks us."""
    url = resolve_article_url(link)
    if "news.google.com" in (urllib.parse.urlparse(url).hostname or ""):
        return url, ""
    try:
        final, page = _http_get(url, timeout=20)
        return final, extract_article_text(page)
    except urllib.error.HTTPError as exc:
        print(f"[WARN] Publisher page blocked/unavailable (HTTP {exc.code}): {url[:100]}")
    except Exception as exc:
        print(f"[WARN] Could not read publisher page ({exc}): {url[:100]}")
    return url, ""


# ---------------------------------------------------------------- Gemini
GURMUKHI = re.compile(r"[\u0A00-\u0A7F]")


_DEAD_MODELS = set()


def _gemini_generate(prompt: str, api_key: str, max_tokens: int = 8192, timeout: int = 90) -> dict:
    """Calls generateContent, trying the model list on 404 and dropping thinkingConfig on 400."""
    live = [m for m in dict.fromkeys(GEMINI_MODELS) if m not in _DEAD_MODELS]
    models = [_GEMINI["model"]] if _GEMINI["model"] in live else live
    last = None
    for model in models:
        for attempt in (1, 2, 3):
            cfg = {"responseMimeType": "application/json", "temperature": 0.3, "maxOutputTokens": max_tokens}
            if _GEMINI["thinking"]:
                cfg["thinkingConfig"] = {"thinkingBudget": 0}
            payload = json.dumps({"contents": [{"parts": [{"text": prompt}]}], "generationConfig": cfg}).encode("utf-8")
            endpoint = f"{GEMINI_API_BASE}/v1beta/models/{model}:generateContent?key={urllib.parse.quote(api_key)}"
            req = urllib.request.Request(endpoint, data=payload, headers={"Content-Type": "application/json"}, method="POST")
            try:
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    raw = json.loads(resp.read().decode("utf-8"))
                if _GEMINI["model"] != model:
                    print(f"[INFO] Using Gemini model: {model}")
                _GEMINI["model"] = model
                return raw
            except urllib.error.HTTPError as exc:
                detail = exc.read().decode("utf-8", errors="ignore")[:400]
                last = RuntimeError(f"Gemini HTTP {exc.code} {exc.reason} ({model}): {detail}")
                if exc.code == 404:
                    _DEAD_MODELS.add(model)  # model does not exist for this key: never try it again
                    if _GEMINI["model"] == model:
                        _GEMINI["model"] = ""
                    break  # model not available -> next model
                if exc.code == 400 and _GEMINI["thinking"] and "think" in detail.lower():
                    _GEMINI["thinking"] = False  # this model does not accept thinkingBudget
                    continue
                if exc.code in (429, 500, 503) and attempt < 3:
                    time.sleep(10 * attempt)
                    continue
                raise last from exc
    if last is not None and "HTTP 404" in str(last) and [m for m in GEMINI_MODELS if m not in _DEAD_MODELS]:
        return _gemini_generate(prompt, api_key, max_tokens, timeout)  # pinned model vanished -> try the rest
    raise last or RuntimeError("No Gemini model available")


def rewrite_with_gemini(item: dict, source_text: str, api_key: str) -> dict:
    """Original, neutral Gurmukhi article + English headline. Raises on any failure (caller falls back)."""
    thin = len(source_text) < 400
    nri = item.get("category") == "NRI"
    prompt = (
        "You are a senior editor at PrimezNews (Punjab regional digital news). Using ONLY the source material "
        "below, write ORIGINAL, neutral, factual news copy in your own words. Re-order the information so the most "
        "important point comes first, use your own sentence structure and vocabulary, and never reuse phrases from "
        "the source. Keep every name, number, date and place exactly as in the source; NEVER invent facts, quotes or "
        "background.\n"
        'Return ONLY valid JSON with exactly these keys:\n'
        '"pa_title": crisp Punjabi (Gurmukhi) headline in your own words, no publisher name or suffix;\n'
        '"en_title": crisp English headline in your own words, no publisher name or suffix;\n'
        '"pa_summary": 2 short Punjabi (Gurmukhi) sentences giving the key detail (shown under the headline in lists);\n'
        '"pa_body": Punjabi (Gurmukhi) news report of 2-3 short paragraphs, about 120-220 words, paragraphs '
        'separated by a blank line (\\n\\n), strictly based on the source'
        + (" (the source is short, so write only what it supports and keep it shorter; never pad with invention)" if thin else "")
        + (', and add one last short paragraph starting with "NRI ਲਈ ਮਤਲਬ:" that explains what this means for Punjabis abroad, using only what the source supports' if nri else "")
        + f', and the very last line must be exactly: ਸਰੋਤ: {item["source_name"]}\n'
        '"priority": "high" if the news is urgent or affects many people (new rules, official announcements, '
        'safety, deadlines, major events), otherwise "low".\n'
        f"Publisher: {item['source_name']}\nDistrict: {item['district']}\nHeadline: {item['title']}\n"
        f"Source material:\n{(source_text or item['summary'] or item['title'])[:MAX_SOURCE_CHARS]}"
    )
    raw = _gemini_generate(prompt, api_key)
    parsed = json.loads(raw["candidates"][0]["content"]["parts"][0]["text"], strict=False)
    pa_title = strip_publisher((parsed.get("pa_title") or "").strip(), item["source_name"])[:480]
    en_title = strip_publisher((parsed.get("en_title") or "").strip(), item["source_name"])[:480]
    pa_summary = (parsed.get("pa_summary") or "").strip()[:2800]
    pa_body = (parsed.get("pa_body") or "").strip()
    if not (pa_title and GURMUKHI.search(pa_title) and en_title and GURMUKHI.search(pa_summary) and len(pa_body) >= 200 and GURMUKHI.search(pa_body)):
        raise RuntimeError("Gemini returned an incomplete or non-Gurmukhi article")
    attribution = f"ਸਰੋਤ: {item['source_name']}"
    if not pa_body.rstrip().endswith(attribution):
        pa_body = re.sub(r"\n*\s*ਸਰੋਤ\s*[:/].*$", "", pa_body, flags=re.S).rstrip() + "\n\n" + attribution
    priority = "high" if str(parsed.get("priority", "")).strip().lower() == "high" else "low"
    return {"title": pa_title, "en": en_title, "summary": pa_summary, "body": pa_body[:95000], "priority": priority}


def fallback_rewrite(item: dict) -> dict:
    summary = item["summary"] or item["title"]
    return {
        "title": item["title"],
        "en": item["en"],
        "summary": summary,
        "body": f"{summary}\n\nSource: {item['source_name']}",
        "priority": "low",
    }


def build_article(item: dict, state: dict) -> dict:
    """Resolve -> extract -> Gemini, with graceful fallbacks. Returns title/en/summary/body/source_url/mode."""
    url, text = fetch_source_text(item["link"])
    if text:
        print(f"[INFO] Source text: {len(text)} chars from {urllib.parse.urlparse(url).hostname}")
    else:
        print("[WARN] Full article text unavailable; using RSS headline/summary only.")
    out, mode = None, "rss-fallback"
    if state.get("gemini_key"):
        try:
            if state.get("last_call") and time.time() - state["last_call"] < 4:
                time.sleep(4)  # stay under the free-tier request rate
            out = rewrite_with_gemini(item, text, state["gemini_key"])
            mode = "gemini-full" if text else "gemini-summary"
        except Exception as exc:
            print(f"[WARN] Gemini rewrite fallback for '{item['title'][:70]}': {exc}")
            if "HTTP 4" in str(exc) and "HTTP 429" not in str(exc):
                state["gemini_key"] = ""  # bad key / blocked: stop calling Gemini this run
        finally:
            state["last_call"] = time.time()
    if out is None:
        out = fallback_rewrite(item)
    out["source_url"] = url if url else item["link"]
    out["mode"] = mode
    return out


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


OPTIONAL_COLUMNS = ("external_guid", "source_name", "source_url", "is_automated", "priority")


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


def patch_story(supabase_url: str, service_key: str, story_id: str, fields: dict) -> None:
    url = f"{supabase_url}/rest/v1/stories?id=eq.{urllib.parse.quote(story_id, safe='')}&status=eq.draft"
    status, text = rest_request("PATCH", url, service_key, fields, "return=minimal")
    if status == 400 and "source_url" in fields:  # optional column missing -> core columns only
        core = {k: v for k, v in fields.items() if k != "source_url"}
        status, text = rest_request("PATCH", url, service_key, core, "return=minimal")
    if status not in (200, 204):
        raise RuntimeError(f"HTTP {status}: {text[:400]}")


def regenerate_drafts(supabase_url: str, service_key: str, state: dict, limit: int) -> int:
    """RSS_REGENERATE=true: rebuild old RSS drafts whose body is still a 1-line stub.
    Only drafts (never published stories) with a short body are touched, so human edits are safe."""
    base = f"{supabase_url}/rest/v1/stories"
    cols = "id,title,en,summary,body,category,district,source_url,source_name"
    q = "&status=eq.draft&id=like.rss-*&order=updated_at.desc&limit=300"
    status, text = rest_request("GET", f"{base}?select={cols}{q}", service_key)
    if status == 400:
        status, text = rest_request("GET", f"{base}?select=id,title,en,summary,body,category,district{q}", service_key)
    if status != 200:
        print(f"[WARN] Cannot list drafts to regenerate (HTTP {status}): {text[:300]}")
        return 0
    done = 0
    for row in json.loads(text or "[]"):
        if len(row.get("body") or "") >= 700:
            continue
        if done >= limit:
            break
        m = re.search(r"https?://[^\s)]+", row.get("body") or "")
        link = row.get("source_url") or (m.group(0) if m else "")
        sm = re.search(r"Source:\s*(.+?)(?:\s*\(|$)", row.get("body") or "")
        tm = re.search(r"\s[-\u2013|]\s([^-\u2013|]{2,45})$", row.get("en") or row["title"])  # old titles end with the publisher
        publisher = (tm.group(1).strip() if tm else "") or row.get("source_name") or (sm.group(1).strip() if sm else "Google News")
        if not link:
            print(f"[WARN] No source link for {row['id']}; skipped.")
            continue
        item = {
            "title": strip_publisher(row.get("en") or row["title"], publisher),
            "en": strip_publisher(row.get("en") or row["title"], publisher),
            "summary": row.get("summary") or row["title"],
            "link": link, "source_name": publisher, "district": row.get("district") or "Chandigarh",
        }
        art = build_article(item, state)
        if art["mode"] == "rss-fallback":
            print(f"[WARN] Not regenerated (no Gemini article): {item['title'][:70]}")
            continue
        try:
            patch_story(supabase_url, service_key, row["id"], {
                "title": art["title"][:500], "en": art["en"][:500], "summary": art["summary"][:3000],
                "body": art["body"][:100000], "source_url": art["source_url"],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            done += 1
            print(f"[OK] Regenerated ({art['mode']}): {art['title'][:80]}")
        except Exception as exc:
            print(f"[WARN] Regenerate failed for {row['id']}: {exc}")
    print(f"Regenerated drafts: {done}")
    return done


def main() -> int:
    service_key = os.environ.get("SUPABASE_SERVICE_KEY", "").strip()
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
    auto_publish = os.environ.get("RSS_AUTO_PUBLISH", "false").strip().lower() == "true"
    regenerate = os.environ.get("RSS_REGENERATE", "false").strip().lower() == "true"
    try:
        max_new = max(1, int(os.environ.get("RSS_MAX_NEW", "20") or 20))
    except ValueError:
        max_new = 20

    if not service_key:
        print("[WARN] SUPABASE_SERVICE_KEY is not set; skipping RSS sync cleanly.")
        return 0

    supabase_url = load_supabase_url()
    print(f"[INFO] Supabase: {supabase_url} · mode={'published' if auto_publish else 'draft'} · gemini={'on' if gemini_key else 'OFF (set GEMINI_API_KEY)'}")
    state = {"gemini_key": gemini_key, "last_call": 0.0}
    age_limit = max_age_hours()
    print(f"[INFO] Freshness filter: only items published in the last {age_limit:g} hours (RSS_MAX_AGE_HOURS)")

    if regenerate:
        if not gemini_key:
            print("[WARN] RSS_REGENERATE needs GEMINI_API_KEY.")
            return 1
        regenerate_drafts(supabase_url, service_key, state, max_new)
        return 0

    try:
        existing, existing_titles, has_cols = fetch_existing(supabase_url, service_key)
    except Exception as exc:
        print(f"[WARN] {exc}")
        return 1
    now_iso = datetime.now(timezone.utc).isoformat()
    attempted: list[str] = []
    skipped = failed = feeds_ok = processed = thin_skipped = 0

    for feed_cfg in RSS_FEEDS:
        if processed >= max_new:
            break
        try:
            req = urllib.request.Request(
                with_recency(feed_cfg["url"], age_limit),
                headers={
                    "User-Agent": BROWSER_UA,
                    "Accept": "application/rss+xml, application/xml, text/xml, */*",
                    "Accept-Language": "en-IN,en;q=0.9,pa;q=0.8",
                },
            )
            with urllib.request.urlopen(req, timeout=25) as resp:
                xml_data = resp.read()
            all_items = parse_feed(xml_data, feed_cfg)
            feeds_ok += 1
            now_utc = datetime.now(timezone.utc)
            items, too_old, undated = [], 0, 0
            for it in all_items:
                pub = it.get("published")
                if pub is None:
                    undated += 1  # unknown age -> never risk publishing stale news
                elif timedelta(minutes=-15) <= now_utc - pub <= timedelta(hours=age_limit):
                    items.append(it)
                else:
                    too_old += 1
            print(f"[OK] Feed '{feed_cfg['name']}': {len(all_items)} items · {len(items)} fresh (<= {age_limit:g}h) · "
                  f"{too_old} too old skipped · {undated} without a date skipped")
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
            if processed >= max_new:
                print(f"[INFO] RSS_MAX_NEW={max_new} reached; remaining items are picked up in the next run.")
                break
            processed += 1
            art = build_article(item, state)
            if art["mode"] == "rss-fallback" and os.environ.get("RSS_ALLOW_THIN", "").lower() not in ("1", "true", "yes"):
                # Gemini did not produce a full article (quota/outage): do not post a headline-only draft.
                # The item is not marked as seen, so the next hourly run tries it again while it is still fresh.
                processed -= 1
                thin_skipped += 1
                print(f"[WARN] Skipped (no full article written): {item['title'][:80]}")
                continue
            body = (art["body"] or "").strip() or f"{item['title']}\n\nSource: {item['source_name']}"
            story_row = {
                "id": row_id,
                "title": art["title"][:500],
                "en": art["en"][:500],
                "summary": (art["summary"] or item["title"])[:3000],
                "body": body[:100000],
                "categories": [item["category"]],
                "category": item["category"],
                "district": item["district"],
                "author": "PrimezNews Desk",
                "image": item["image"],
                "status": "published" if auto_publish else "draft",
                "publish_at": now_iso if auto_publish else None,
                "updated_at": now_iso,
                "external_guid": item["external_guid"],
                "source_name": item["source_name"],
                "source_url": art["source_url"],
                "is_automated": True,
                "priority": art.get("priority", "low"),
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
            print(f"[OK] Sent ({story_row['status']}, {art['mode']}{', core columns' if result == 'inserted-core' else ''}): {story_row['title'][:90]}")

    verified = verify_inserted(supabase_url, service_key, attempted) if attempted else set()
    inserted = len(verified)
    missing = [i for i in attempted if i not in verified]
    if missing:
        print(f"[WARN] {len(missing)} row(s) were accepted by the API but NOT found afterwards: {missing[:5]}")
    print(
        f"RSS sync finished. New stories added: {inserted} · skipped (already present): {skipped} · "
        f"failed: {failed} · held back (no full article): {thin_skipped} (mode={'published' if auto_publish else 'draft'})"
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
