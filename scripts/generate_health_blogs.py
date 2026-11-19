"""Daily Health & Beauty blog generator (4-5 new posts per day, rotating over 10 topics).

Writes new posts at the top of data/health-blog.json (same format as the hand-written posts:
Punjabi + Hindi + English for every field). The existing builder then turns them into pages:

    python scripts/generate_health_blogs.py      # needs GEMINI_API_KEY
    python scripts/build_health_blog.py          # health-blog/<slug>/index.html, share cards, health-beauty.html

Env (all optional except the key):
    GEMINI_API_KEY          Google AI Studio key
    HEALTH_BLOGS_PER_DAY    1-10. Default: 4 on even days, 5 on odd days of the year  ("4-5 a day")
    HEALTH_BLOG_DRAFT=true  do NOT publish: write to data/health-blog-drafts.json for manual review
                            (move an entry into data/health-blog.json to publish it)

Rotation: every run takes the topics that were written LEAST recently, so the 10 topics take turns and
nothing repeats. Titles/slugs already present are never reused. Re-running on the same day only tops up
to the daily number, it never creates extra posts.
"""
import json
import os
import re
import sys
import time
import zlib
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fetch_rss_news as rss  # noqa: E402  (shared Gemini client: model fallback, retries, error bodies)

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "health-blog.json"
DRAFTS = ROOT / "data" / "health-blog-drafts.json"
IST = timezone(timedelta(hours=5, minutes=30))
LANGS = ("pa", "hi", "en")

# tag -> labels (new tags are added to data/health-blog.json automatically)
TAGS = {
    "health-news":     {"pa": "ਸਿਹਤ ਖ਼ਬਰਾਂ", "hi": "स्वास्थ्य समाचार", "en": "Health news"},
    "beauty":          {"pa": "ਸੁੰਦਰਤਾ", "hi": "सौंदर्य", "en": "Beauty"},
    "fitness":         {"pa": "ਫਿਟਨੈੱਸ", "hi": "फिटनेस", "en": "Fitness"},
    "diet":            {"pa": "ਖੁਰਾਕ", "hi": "आहार", "en": "Diet"},
    "de-addiction":    {"pa": "ਨਸ਼ਾ ਮੁਕਤੀ ਤੇ ਮਾਨਸਿਕ ਸਿਹਤ", "hi": "नशा मुक्ति व मानसिक स्वास्थ्य", "en": "Mental health & de-addiction"},
    "health-schemes":  {"pa": "ਸਿਹਤ ਯੋਜਨਾਵਾਂ", "hi": "स्वास्थ्य योजनाएँ", "en": "Health schemes"},
    "sexual-wellness": {"pa": "ਚੰਗੀ ਸਿਹਤ ਤੇ ਰਿਸ਼ਤੇ", "hi": "अच्छी सेहत व रिश्ते", "en": "Good sex life"},
    "hair-care":       {"pa": "ਵਾਲਾਂ ਦੀ ਦੇਖਭਾਲ", "hi": "बालों की देखभाल", "en": "Hair care"},
    "mind":            {"pa": "ਮਾਨਸਿਕ ਸਿਹਤ", "hi": "मानसिक स्वास्थ्य", "en": "Mental health"},
    "skin-care":       {"pa": "ਚਮੜੀ ਦੀ ਦੇਖਭਾਲ", "hi": "त्वचा की देखभाल", "en": "Skin care"},
}

# The 10 topics, in a fixed order. `images` are existing assets/images/<name>.webp files.
TOPICS = [
    {"tag": "health-news", "name": "Health news", "images": ["news-health", "city"],
     "brief": "Evergreen health explainers on topics that are often in the news (seasonal illnesses, vaccination awareness, "
              "air-pollution and heat/cold safety, hospital visits). Do NOT report specific recent events, outbreaks, numbers or quotes."},
    {"tag": "beauty", "name": "Beauty", "images": ["people"],
     "brief": "Everyday grooming and natural-beauty habits for Punjab's climate; healthy routines over products. No brand names, no miracle claims."},
    {"tag": "fitness", "name": "Yoga & fitness", "images": ["sport", "fields"],
     "brief": "Beginner-friendly yoga, stretching, walking and home workouts; simple routines, posture, safety and gradual progress; who should check with a doctor first."},
    {"tag": "diet", "name": "Diet & food", "images": ["wheat", "fields"],
     "brief": "Balanced Punjabi/North-Indian home food, seasonal produce, portion sense, hydration, healthy swaps, reading food labels. No crash diets, no calorie targets for individuals."},
    {"tag": "de-addiction", "name": "Mental health & de-addiction", "images": ["people", "campus"],
     "brief": "Compassionate, stigma-free guidance on substance use and recovery: warning signs, how families can support, treatment is possible, "
              "where to seek help (a doctor, a government de-addiction/OOAT centre, the Tele-MANAS helpline 14416). No instructions about drugs or doses."},
    {"tag": "health-schemes", "name": "Health schemes", "images": ["news-health", "people"],
     "brief": "Plain-language explainers on public health schemes and services in India/Punjab (e.g. Ayushman Bharat PM-JAY, Ayushman Arogya Mandirs, free "
              "vaccination, Janani Suraksha). Describe only what you are sure of, avoid exact amounts/dates/eligibility rules, and tell readers to confirm on the official portal or at the nearest government hospital."},
    {"tag": "sexual-wellness", "name": "Good sex life", "images": ["people", "city"],
     "brief": "Respectful, NON-EXPLICIT adult sexual-health education: communication and consent between partners, myths vs facts, stress and sleep, hygiene, "
              "safe practices and contraception basics, when to talk to a doctor. No graphic detail, no positions/acts, no products, no pills, no shaming."},
    {"tag": "hair-care", "name": "Hair care", "images": ["people"],
     "brief": "Practical hair and scalp care: washing, oiling myths, diet and stress links, seasonal care, when hair fall needs a doctor. No miracle cures, no brands."},
    {"tag": "mind", "name": "Mental health", "images": ["people", "campus"],
     "brief": "Everyday mental well-being: stress, sleep, anxiety, low mood, screen time, talking to someone, when to see a professional; mention Tele-MANAS 14416 where relevant. No diagnosis."},
    {"tag": "skin-care", "name": "Skin care", "images": ["people", "fields"],
     "brief": "Simple skin care: cleansing, moisturising, sun protection, seasonal dryness, acne and sun myths, when to see a dermatologist. No brands, no miracle claims."},
]

GURMUKHI = re.compile(r"[਀-੿]")
DEVANAGARI = re.compile(r"[ऀ-ॿ]")
LATIN = re.compile(r"[A-Za-z]{3}")
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def log(msg):
    print(msg, flush=True)


def load(path, default):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


def save(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def norm(text):
    return re.sub(r"[^a-z0-9]+", " ", (text or "").lower()).strip()


def per_day(today):
    raw = os.environ.get("HEALTH_BLOGS_PER_DAY", "").strip()
    if raw.isdigit():
        return min(10, max(1, int(raw)))
    return 4 + (today.timetuple().tm_yday % 2)


def tri_ok(obj, minimum=1):
    return (isinstance(obj, dict) and all(isinstance(obj.get(k), str) and len(obj[k].strip()) >= minimum for k in LANGS)
            and GURMUKHI.search(obj["pa"]) and DEVANAGARI.search(obj["hi"]) and LATIN.search(obj["en"]))


def validate(post):
    """Raises ValueError unless the Gemini JSON is a complete trilingual post."""
    if not SLUG.match(post.get("slug", "")) or len(post["slug"]) > 80:
        raise ValueError("bad slug")
    for key in ("title", "excerpt"):
        if not tri_ok(post.get(key), 8):
            raise ValueError(f"{key} must have Punjabi (Gurmukhi), Hindi (Devanagari) and English")
    pts = post.get("points")
    if not (isinstance(pts, list) and 3 <= len(pts) <= 5 and all(tri_ok(x, 8) for x in pts)):
        raise ValueError("points must be 3-5 trilingual items")
    body = post.get("body")
    if not (isinstance(body, list) and 5 <= len(body) <= 16):
        raise ValueError("body must be 5-16 blocks")
    words = 0
    for b in body:
        if not isinstance(b, dict) or len(b) != 1:
            raise ValueError("each body block must have exactly one key")
        (kind, val), = b.items()
        if kind in ("h2", "p", "tip"):
            if not tri_ok(val, 3):
                raise ValueError(f"{kind} block is not trilingual")
            words += len(val["en"].split()) if kind != "h2" else 0
        elif kind in ("ul", "ol"):
            if not (isinstance(val, list) and 2 <= len(val) <= 8 and all(tri_ok(x, 3) for x in val)):
                raise ValueError("list block is not trilingual")
            words += sum(len(x["en"].split()) for x in val)
        else:
            raise ValueError(f"unknown block {kind}")
    if words < 150:
        raise ValueError(f"article too short ({words} English words)")
    return words


def build_prompt(topic, avoid_titles):
    avoid = "\n".join(f"- {t}" for t in avoid_titles[:40]) or "- (none yet)"
    shape = '{"pa":"ਪੰਜਾਬੀ","hi":"हिन्दी","en":"English"}'
    return f"""You are the health editor of PrimezNews, a Punjab (India) news site. Write ONE original, respectful, medically responsible
blog article for general readers in Punjab. Topic area: "{topic['name']}".
Topic guidance: {topic['brief']}

Hard rules:
- Be accurate and conservative. Use widely accepted guidance (WHO, ICMR, Ministry of Health). NEVER invent statistics, studies, quotes, dates, brands or news events.
- No diagnosis, no medicine names or doses, no cure or "miracle" claims, no fear-mongering. Say when to see a doctor.
- Non-explicit, dignified, inclusive language. No shaming.
- Pick a fresh, specific angle (a practical question readers actually have). Do NOT reuse or closely paraphrase these existing titles:
{avoid}
- Write natural Punjabi (Gurmukhi), natural Hindi (Devanagari) and clear English. All three must say the same thing.

Return ONLY valid JSON, exactly this shape, where every TRI value is an object {shape}:
{{"slug":"3-7 lower-case english words joined by hyphens",
 "title":TRI (max 80 chars each),
 "excerpt":TRI (one sentence, 20-30 words),
 "points":[TRI,TRI,TRI] (3 key takeaways, each one short sentence),
 "body":[
   {{"p":TRI}} (intro, 2-3 sentences),
   {{"h2":TRI}}, {{"p":TRI}}, {{"ul":[TRI,TRI,TRI]}},
   {{"h2":TRI}}, {{"p":TRI}}, {{"ol":[TRI,TRI,TRI]}},
   {{"h2":TRI}}, {{"p":TRI}},
   {{"tip":TRI}} (one practical, safe tip; the last block)
 ]}}
Total length about 350-450 English words (and the same content in Punjabi and Hindi). No markdown, no HTML."""


def generate_post(topic, avoid_titles, state):
    if state.get("last_call") and time.time() - state["last_call"] < 4:
        time.sleep(4)  # stay under the free-tier request rate
    try:
        raw = rss._gemini_generate(build_prompt(topic, avoid_titles), os.environ["GEMINI_API_KEY"], max_tokens=16000, timeout=180)
    finally:
        state["last_call"] = time.time()
    text = raw["candidates"][0]["content"]["parts"][0]["text"]
    post = json.loads(text, strict=False)
    words = validate(post)
    return post, words


def main():
    if not os.environ.get("GEMINI_API_KEY", "").strip():
        log("[WARN] GEMINI_API_KEY is not set - cannot write blogs.")
        return 1
    draft_mode = os.environ.get("HEALTH_BLOG_DRAFT", "false").strip().lower() == "true"
    today = datetime.now(IST).date()
    iso = today.isoformat()
    target = per_day(today)

    data = load(DATA, {"tags": {}, "posts": []})
    drafts = load(DRAFTS, {"posts": []})
    everything = data["posts"] + drafts["posts"]
    done_today = sum(1 for p in everything if p.get("auto") and p.get("date") == iso)
    need = target - done_today
    log(f"[INFO] {iso} (IST): target {target} blogs/day, already generated today: {done_today}, mode={'DRAFT (review)' if draft_mode else 'publish'}")
    if need <= 0:
        log("[OK] Today's blogs already exist - nothing to do.")
        return 0

    # least-recently-written topics first (ties keep the fixed topic order) -> clean rotation, no repeats
    last = {}
    for p in everything:
        last[p.get("tag")] = max(last.get(p.get("tag"), ""), p.get("date", ""))
    order = sorted(range(len(TOPICS)), key=lambda i: (last.get(TOPICS[i]["tag"], ""), i))
    chosen = [TOPICS[i] for i in order[:need]]
    log("[INFO] Topics this run: " + ", ".join(t["name"] for t in chosen))

    used_slugs = {p["slug"] for p in everything}
    used_titles = {norm(p["title"]["en"]) for p in everything}
    state, made = {"last_call": 0.0}, []
    for topic in chosen:
        avoid = [p["title"]["en"] for p in everything if p.get("tag") == topic["tag"]]
        post = words = None
        for attempt in (1, 2):
            try:
                post, words = generate_post(topic, avoid, state)
                if norm(post["title"]["en"]) in used_titles:
                    raise ValueError("duplicate title")
                break
            except Exception as exc:
                log(f"[WARN] {topic['name']} attempt {attempt} failed: {exc}")
                post = None
        if not post:
            continue
        slug, n = post["slug"], 2
        while slug in used_slugs:
            slug = f"{post['slug']}-{n}"; n += 1
        image = topic["images"][zlib.crc32(slug.encode()) % len(topic["images"])]
        if not (ROOT / "assets" / "images" / f"{image}.webp").exists():
            image = "news-health"
        entry = {
            "slug": slug, "image": image, "date": iso,
            "author": {"pa": "PrimezNews ਸਿਹਤ ਡੈਸਕ", "hi": "PrimezNews हेल्थ डेस्क", "en": "PrimezNews Health Desk"},
            "tag": topic["tag"], "minutes": max(3, round(words / 180)),
            "title": {k: post["title"][k].strip() for k in LANGS},
            "excerpt": {k: post["excerpt"][k].strip() for k in LANGS},
            "points": [{k: x[k].strip() for k in LANGS} for x in post["points"]],
            "body": post["body"],
            "auto": True,
        }
        used_slugs.add(slug); used_titles.add(norm(entry["title"]["en"])); everything.append(entry); made.append(entry)
        log(f"[OK] {topic['name']}: {entry['title']['en']}  ({slug}, {words} words)")

    if not made:
        log("[WARN] No blog could be generated.")
        return 1
    if draft_mode:
        drafts["posts"] = made + drafts["posts"]
        save(DRAFTS, drafts)
    else:
        for t, label in TAGS.items():
            data["tags"].setdefault(t, label)
        data["posts"] = made + data["posts"]
        save(DATA, data)
    log(f"[OK] {len(made)} new blog(s) written to {(DRAFTS if draft_mode else DATA).relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
