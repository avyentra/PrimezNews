"""Daily Health & Beauty blog generator (4-5 new posts per day, rotating over 10 topics, each at least 1200 words).

Writes new posts at the top of data/health-blog.json (same format as the hand-written posts:
Punjabi + Hindi + English for every field). The existing builder then turns them into pages:

    python scripts/generate_health_blogs.py      # needs GEMINI_API_KEY
    python scripts/build_health_blog.py          # health-blog/<slug>/index.html, share cards, health-beauty.html

Env (all optional except the key):
    GEMINI_API_KEY          Google AI Studio key
    HEALTH_BLOGS_PER_DAY    1-10. Default: 4 on even days, 5 on odd days of the year  ("4-5 a day")
    HEALTH_BLOG_MIN_WORDS   minimum English words per article (default 1200)
    HEALTH_BLOG_SKIP_TAGS   comma list of topic tags NOT to write (default "sexual-wellness": Google AdSense is strict about
                            sexual-health content; set it to "none" to write that topic too)
    HEALTH_BLOG_TRENDS      "false" turns off the Google Trends (India) keyword hints
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
    {"tag": "health-news", "keywords": ['winter health tips for adults', 'how to prevent seasonal flu naturally', 'air pollution health effects and protection', 'dengue symptoms and prevention at home', 'how to stay healthy in smog', 'vaccination schedule for adults in India', 'heat stroke prevention tips', 'when to visit a hospital emergency', 'cold and cough home care for kids', 'stubble burning smoke health risks', 'how to boost immunity naturally', 'fever in children when to worry'], "name": "Health news", "images": ["news-health", "city"],
     "brief": "Evergreen health explainers on topics that are often in the news (seasonal illnesses, vaccination awareness, "
              "air-pollution and heat/cold safety, hospital visits). Do NOT report specific recent events, outbreaks, numbers or quotes."},
    {"tag": "beauty", "keywords": ['natural glowing skin tips at home', 'winter skincare routine for dry skin', 'how to get healthy skin naturally', 'homemade face pack for glowing skin', 'daily grooming tips for men', 'how to reduce dark circles naturally', 'lip care tips in winter', 'how to remove tan naturally', 'nail care tips at home', 'simple self care routine for women', 'how to get clear skin naturally', 'best habits for healthy looking skin'], "name": "Beauty", "images": ["people"],
     "brief": "Everyday grooming and natural-beauty habits for Punjab's climate; healthy routines over products. No brand names, no miracle claims."},
    {"tag": "fitness", "keywords": ['yoga for beginners at home', 'surya namaskar benefits and steps', 'how to lose belly fat naturally', '30 minute home workout without equipment', 'yoga for back pain relief', 'morning stretching routine', 'how many steps should you walk daily', 'yoga for weight loss', 'how to start exercising after 40', 'pranayama benefits for beginners', 'desk job stretches for neck and back', 'how to build stamina naturally'], "name": "Yoga & fitness", "images": ["sport", "fields"],
     "brief": "Beginner-friendly yoga, stretching, walking and home workouts; simple routines, posture, safety and gradual progress; who should check with a doctor first."},
    {"tag": "diet", "keywords": ['healthy indian diet plan', 'high protein vegetarian foods', 'how to eat healthy on a budget', 'best foods for strong immunity in winter', 'healthy punjabi food swaps', 'how to reduce sugar intake', 'foods for good digestion', 'how much water should you drink daily', 'healthy breakfast ideas indian', 'iron rich foods for women', 'foods to control diabetes naturally', 'how to read food labels in India'], "name": "Diet & food", "images": ["wheat", "fields"],
     "brief": "Balanced Punjabi/North-Indian home food, seasonal produce, portion sense, hydration, healthy swaps, reading food labels. No crash diets, no calorie targets for individuals."},
    {"tag": "de-addiction", "keywords": ['signs of drug addiction in a family member', 'how to help someone quit alcohol', 'de-addiction treatment in Punjab', 'how to quit smoking naturally', 'how to talk to a teenager about drugs', 'relapse prevention tips', 'how families can support recovery', 'tobacco quitting tips that work', 'how to stop mobile phone addiction', 'withdrawal symptoms when to see a doctor', 'Tele-MANAS helpline how it helps', 'stigma around addiction and mental health'], "name": "Mental health & de-addiction", "images": ["people", "campus"],
     "brief": "Compassionate, stigma-free guidance on substance use and recovery: warning signs, how families can support, treatment is possible, "
              "where to seek help (a doctor, a government de-addiction/OOAT centre, the Tele-MANAS helpline 14416). No instructions about drugs or doses."},
    {"tag": "health-schemes", "keywords": ['Ayushman Bharat card how to check eligibility', 'Ayushman Arogya Mandir services', 'free health check up government schemes India', 'Janani Suraksha Yojana benefits explained', 'how to get free treatment in government hospital', 'Ayushman card hospital list how to find', 'national health mission services explained', 'free vaccination programme India for children', 'e-Sanjeevani free online doctor consultation', 'Punjab government health services for families', 'Pradhan Mantri Jan Arogya Yojana explained', 'how to apply for health insurance scheme in India'], "name": "Health schemes", "images": ["news-health", "people"],
     "brief": "Plain-language explainers on public health schemes and services in India/Punjab (e.g. Ayushman Bharat PM-JAY, Ayushman Arogya Mandirs, free "
              "vaccination, Janani Suraksha). Describe only what you are sure of, avoid exact amounts/dates/eligibility rules, and tell readers to confirm on the official portal or at the nearest government hospital."},
    {"tag": "sexual-wellness", "keywords": ['how to talk to your partner about health', 'myths and facts about reproductive health', 'stress and sleep effects on relationships', 'contraception basics explained', 'when to see a doctor about sexual health'], "name": "Good sex life", "images": ["people", "city"],
     "brief": "Respectful, NON-EXPLICIT adult sexual-health education: communication and consent between partners, myths vs facts, stress and sleep, hygiene, "
              "safe practices and contraception basics, when to talk to a doctor. No graphic detail, no positions/acts, no products, no pills, no shaming."},
    {"tag": "hair-care", "keywords": ['how to stop hair fall naturally', 'dandruff home remedies that work', 'hair care routine for winter', 'how often should you wash your hair', 'does oiling hair really help', 'foods for healthy hair growth', 'how to treat dry scalp at home', 'hair fall after stress why it happens', 'how to make hair thicker naturally', 'grey hair causes and care', 'hair care tips for men', 'scalp care for healthy hair'], "name": "Hair care", "images": ["people"],
     "brief": "Practical hair and scalp care: washing, oiling myths, diet and stress links, seasonal care, when hair fall needs a doctor. No miracle cures, no brands."},
    {"tag": "mind", "keywords": ['how to reduce stress and anxiety naturally', 'how to sleep better at night', 'signs of anxiety and when to seek help', 'how to deal with overthinking', 'digital detox tips for better mental health', 'how to manage exam stress', 'how to feel less lonely', 'burnout symptoms and recovery', 'mindfulness meditation for beginners', 'how to build a healthy morning routine', 'low mood vs depression what is the difference', 'how to help a friend with anxiety'], "name": "Mental health", "images": ["people", "campus"],
     "brief": "Everyday mental well-being: stress, sleep, anxiety, low mood, screen time, talking to someone, when to see a professional; mention Tele-MANAS 14416 where relevant. No diagnosis."},
    {"tag": "skin-care", "keywords": ['how to remove pimples naturally', 'sunscreen how to choose and use in India', 'how to treat dry skin in winter', 'oily skin care routine', 'pigmentation causes and prevention', 'how to prevent acne scars', 'how to get rid of dark spots naturally', 'skin care routine for beginners', 'how to protect skin from pollution', 'eczema care tips when to see a dermatologist', 'how to treat sunburn at home', 'best way to moisturise skin'], "name": "Skin care", "images": ["people", "fields"],
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


HEALTH_WORDS = ("health", "fever", "flu", "dengue", "covid", "diabetes", "cancer", "heart", "yoga", "diet", "weight", "skin", "hair", "sleep",
                "stress", "anxiety", "vaccine", "pollution", "smog", "cold", "cough", "virus", "doctor", "hospital", "medicine", "fitness", "protein",
                "ayushman", "immunity", "calorie", "vitamin", "bp ", "blood", "tobacco", "smoking", "alcohol", "mental")


def trending_hints(limit=12):
    """Health-related search topics trending in India right now (Google Trends public RSS). Used only as keyword IDEAS."""
    if os.environ.get("HEALTH_BLOG_TRENDS", "true").strip().lower() == "false":
        return []
    import urllib.request
    import xml.etree.ElementTree as ET
    out = []
    for url in ("https://trends.google.com/trending/rss?geo=IN", "https://trends.google.com/trends/trendingsearches/daily/rss?geo=IN"):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; PrimezNewsBot/1.0)"})
            with urllib.request.urlopen(req, timeout=20) as r:
                root = ET.fromstring(r.read())
            for item in root.iter("item"):
                t = (item.findtext("title") or "").strip()
                if t and any(w in t.lower() + " " for w in HEALTH_WORDS):
                    out.append(t)
            if out:
                break
        except Exception as exc:  # trends are a bonus, never a blocker
            log(f"[WARN] Google Trends not available ({exc})")
    if not out:  # fallback: what Indian readers are reading about health today (Google News headlines, used ONLY as topic ideas)
        try:
            req = urllib.request.Request("https://news.google.com/rss/search?q=health+India+when:2d&hl=en-IN&gl=IN&ceid=IN:en",
                                         headers={"User-Agent": "Mozilla/5.0 (compatible; PrimezNewsBot/1.0)"})
            with urllib.request.urlopen(req, timeout=20) as r:
                root = ET.fromstring(r.read())
            for item in root.iter("item"):
                t = re.sub(r"\s+-\s+[^-]+$", "", (item.findtext("title") or "").strip())
                if t:
                    out.append(t)
        except Exception as exc:
            log(f"[WARN] Google News hints not available ({exc}); using the built-in keyword lists")
    return list(dict.fromkeys(out))[:limit]


def pick_keyword(topic, used_keywords, today):
    """Next high-intent keyword of the topic that has not been written yet (rotates by day, so it never repeats)."""
    pool = [k for k in topic["keywords"] if norm(k) not in used_keywords]
    if not pool:
        pool = list(topic["keywords"])
    return pool[today.toordinal() % len(pool)]


def similar(a, b, limit=0.6):
    x, y = set(norm(a).split()), set(norm(b).split())
    return bool(x and y) and len(x & y) / len(x | y) >= limit


def per_day(today):
    raw = os.environ.get("HEALTH_BLOGS_PER_DAY", "").strip()
    if raw.isdigit():
        return min(10, max(1, int(raw)))
    return 4 + (today.timetuple().tm_yday % 2)


def tri_ok(obj, minimum=1):
    return (isinstance(obj, dict) and all(isinstance(obj.get(k), str) and len(obj[k].strip()) >= minimum for k in LANGS)
            and GURMUKHI.search(obj["pa"]) and DEVANAGARI.search(obj["hi"]) and LATIN.search(obj["en"]))


def validate(post, min_words=1200):
    """Raises ValueError unless the Gemini JSON is a complete trilingual post."""
    if not SLUG.match(post.get("slug", "")) or len(post["slug"]) > 80:
        raise ValueError("bad slug")
    for key in ("title", "excerpt"):
        if not tri_ok(post.get(key), 8):
            raise ValueError(f"{key} must have Punjabi (Gurmukhi), Hindi (Devanagari) and English")
    pts = post.get("points")
    if not (isinstance(pts, list) and 3 <= len(pts) <= 5 and all(tri_ok(x, 8) for x in pts)):
        raise ValueError("points must be 3-5 trilingual items")
    faq = post.get("faq")
    if not (isinstance(faq, list) and 3 <= len(faq) <= 6 and all(isinstance(f, dict) and tri_ok(f.get("q"), 8) and tri_ok(f.get("a"), 8) for f in faq)):
        raise ValueError("faq must be 3-6 trilingual question/answer pairs")
    body = post.get("body")
    if not (isinstance(body, list) and 8 <= len(body) <= 40):
        raise ValueError("body must be 8-40 blocks")
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
    if words < min_words:
        raise ValueError(f"article too short ({words} English words, minimum {min_words})")
    return words


def en_words(body):
    n = 0
    for blk in body:
        (kind, val), = blk.items()
        if kind == "h2":
            continue
        n += len(val.split()) if isinstance(val, str) else sum(len(x.split()) for x in val)
    return n


def build_prompt(topic, avoid_titles, min_words, keyword, hints, note=""):
    avoid = "\n".join(f"- {t}" for t in avoid_titles[:40]) or "- (none yet)"
    trend = ("\nTrending searches in India right now (ideas only; use one ONLY if it truly fits this topic, never copy any news): " + "; ".join(hints)) if hints else ""
    return f"""You are the health editor of PrimezNews, a Punjab (India) news site. Write ONE original, respectful, medically responsible,
in-depth blog article in clear English for general readers in Punjab. Topic area: "{topic['name']}".
Topic guidance: {topic['brief']}
PRIMARY SEO KEYWORD (a phrase many people search on Google): "{keyword}"{trend}
SEO rules: put the primary keyword in the title (near the start), in the first paragraph, in the slug, in the excerpt and in one h2; use 3-5 related
long-tail phrases naturally (never stuff or repeat unnaturally); answer the search intent directly in the first 100 words; write for people first.
ORIGINALITY (copyright safe): write everything fresh in your own words from general medical knowledge. Do NOT copy, translate or closely paraphrase
any website, news article, book, government page, video or blog. No quotations, no lyrics, no brand or product names, no real people. Add original
practical examples relevant to Punjab (seasons, food, daily routine) so the article is unique and genuinely useful.
GOOGLE ADSENSE SAFE: helpful, trustworthy, non-sensational. No clickbait, no shocking claims, no adult or explicit content, no gambling, no weapons, no
hate, no miracle cures, no "guaranteed" results.
{note}
LENGTH IS CRITICAL: the article body must be AT LEAST {min_words + 150} words (aim for {min_words + 300}). Count only the paragraphs, list items and tip.
Use 6-8 sections (h2), each with 1-2 full paragraphs of 80-140 words; add bullet or numbered lists, one section on common myths vs facts,
one on "when to see a doctor", and a short closing paragraph. Be specific and practical, not repetitive filler.

Hard rules:
- Be accurate and conservative. Use widely accepted guidance (WHO, ICMR, Ministry of Health). NEVER invent statistics, studies, quotes, dates, brands or news events.
- No diagnosis, no medicine names or doses, no cure or "miracle" claims, no fear-mongering. Say when to see a doctor.
- Non-explicit, dignified, inclusive language. No shaming.
- Pick a fresh, specific angle readers actually care about. Do NOT reuse or closely paraphrase these existing titles:
{avoid}

Also write 4 FAQ items (the questions real people type into Google about this keyword; answers of 35-60 words each).
Return ONLY valid JSON of this shape (plain strings, no markdown, no HTML):
{{"slug":"3-7 lower-case english words joined by hyphens, containing the main keyword words",
 "keyword":"the primary keyword you used",
 "keywords":["3 to 5 related search phrases"],
 "title":"max 70 characters, starts with or clearly contains the primary keyword",
 "excerpt":"one sentence of 140-160 characters that contains the primary keyword",
 "faq":[{{"q":"question","a":"answer"}},{{"q":"question","a":"answer"}},{{"q":"question","a":"answer"}},{{"q":"question","a":"answer"}}],
 "points":["key takeaway 1","key takeaway 2","key takeaway 3"],
 "body":[{{"p":"intro paragraph"}},{{"h2":"heading"}},{{"p":"paragraph"}},{{"ul":["item","item","item"]}},{{"h2":"heading"}},{{"p":"paragraph"}},{{"ol":["step","step","step"]}}, ... ,{{"tip":"one practical safe tip (last block)"}}]}}"""


def translate_prompt(article, lang):
    name = {"pa": "Punjabi in Gurmukhi script (ਪੰਜਾਬੀ)", "hi": "Hindi in Devanagari script (हिन्दी)"}[lang]
    return f"""Translate this health article into natural, fluent {name}, written for ordinary readers in Punjab.
Translate EVERY string completely - do not summarise, shorten or skip anything; keep the same meaning and length.
Keep the JSON structure EXACTLY the same (same keys, same number of blocks, same number of list items, same order). Do not translate JSON keys.
Keep numbers, units and the helpline number 14416 unchanged. Return ONLY the JSON.

{json.dumps(article, ensure_ascii=False)}"""


class QuotaExhausted(RuntimeError):
    """Gemini free-tier quota for today is used up on every model - stop politely and keep what was written."""


def _rotate_model():
    models = [m for m in dict.fromkeys(rss.GEMINI_MODELS) if m not in rss._DEAD_MODELS] or list(dict.fromkeys(rss.GEMINI_MODELS))
    cur = rss._GEMINI.get("model")
    nxt = models[(models.index(cur) + 1) % len(models)] if cur in models else models[0]
    rss._GEMINI["model"] = nxt
    log(f"[INFO] Switching Gemini model -> {nxt} (quota is per model)")


def call_json(prompt, max_tokens, state):
    """Gemini call with spacing, waits on 429/503 (per-minute limits) and model rotation (daily limits)."""
    gap = 12  # seconds between calls: keeps tokens-per-minute under the free-tier limit
    wait_left = gap - (time.time() - state["last_call"]) if state.get("last_call") else 0
    if wait_left > 0:
        time.sleep(wait_left)
    rotations = 0
    for attempt in range(1, 8):
        try:
            raw = rss._gemini_generate(prompt, os.environ["GEMINI_API_KEY"], max_tokens=max_tokens, timeout=240)
            state["last_call"] = time.time()
            return json.loads(raw["candidates"][0]["content"]["parts"][0]["text"], strict=False)
        except json.JSONDecodeError:
            state["last_call"] = time.time()
            raise
        except Exception as exc:
            state["last_call"] = time.time()
            msg = str(exc)
            if "HTTP 429" in msg:
                daily = "PerDay" in msg or "per day" in msg.lower()
                if daily or attempt in (2, 4):
                    rotations += 1
                    if rotations > len(set(rss.GEMINI_MODELS)):
                        raise QuotaExhausted(msg[:200]) from exc
                    _rotate_model()
                    continue
                log(f"[INFO] Gemini rate limit; waiting 65 s (attempt {attempt})")
                time.sleep(65)
                continue
            if "HTTP 503" in msg or "HTTP 500" in msg:
                log(f"[INFO] Gemini busy; waiting 30 s (attempt {attempt})")
                time.sleep(30)
                continue
            raise
    raise QuotaExhausted("Gemini kept failing after several waits")


def clean_body(body):
    """Gemini sometimes puts two keys in one block ({"h2":..,"p":..}); split them into one-key blocks."""
    out = []
    for blk in body if isinstance(body, list) else []:
        if not isinstance(blk, dict):
            continue
        for k, v in blk.items():
            if k in ("h2", "p", "tip", "ul", "ol") and v:
                out.append({k: v})
    return out


def shape_of(article):
    return [(k, len(v) if isinstance(v, list) else None) for blk in article["body"] for k, v in blk.items()], len(article["points"]), len(article["faq"])


def merge(en, pa, hi):
    """English + Punjabi + Hindi article -> the trilingual format used by data/health-blog.json."""
    if not (shape_of(en) == shape_of(pa) == shape_of(hi)):
        raise ValueError("translation changed the article structure")
    tri = lambda a, b, c: {"pa": str(b).strip(), "hi": str(c).strip(), "en": str(a).strip()}
    body = []
    for be, bp, bh in zip(en["body"], pa["body"], hi["body"]):
        (kind, ve), = be.items()
        vp, vh = bp[kind], bh[kind]
        body.append({kind: [tri(x, y, z) for x, y, z in zip(ve, vp, vh)] if isinstance(ve, list) else tri(ve, vp, vh)})
    return {
        "slug": en["slug"], "title": tri(en["title"], pa["title"], hi["title"]),
        "excerpt": tri(en["excerpt"], pa["excerpt"], hi["excerpt"]),
        "points": [tri(x, y, z) for x, y, z in zip(en["points"], pa["points"], hi["points"])],
        "faq": [{"q": tri(a["q"], b["q"], c["q"]), "a": tri(a["a"], b["a"], c["a"])} for a, b, c in zip(en["faq"], pa["faq"], hi["faq"])],
        "body": body,
        "keyword": str(en.get("keyword", "")).strip(),
        "keywords": [str(k).strip() for k in en.get("keywords", []) if str(k).strip()][:6],
    }


def generate_post(topic, avoid_titles, state, min_words, keyword, hints):
    note = ""
    for attempt in (1, 2, 3):  # an article that is too short is regenerated, never published
        en = call_json(build_prompt(topic, avoid_titles, min_words, keyword, hints, note), 14000, state)
        en["body"] = clean_body(en.get("body"))
        if not en["body"] or not isinstance(en.get("points"), list) or not isinstance(en.get("faq"), list):
            raise ValueError("English article has no body/points/faq")
        words = en_words(en["body"])
        if words >= min_words:
            break
        log(f"[WARN] {topic['name']}: English draft has only {words} words (< {min_words}); regenerating longer")
        note = f"IMPORTANT: your previous attempt had only {words} words. Write MUCH longer: at least {min_words + 300} words, with more sections and fuller paragraphs."
    else:
        raise ValueError(f"article stayed shorter than {min_words} words")
    pa = call_json(translate_prompt({k: en[k] for k in ("title", "excerpt", "points", "faq", "body")}, "pa"), 32000, state)
    hi = call_json(translate_prompt({k: en[k] for k in ("title", "excerpt", "points", "faq", "body")}, "hi"), 32000, state)
    pa["body"], hi["body"] = clean_body(pa.get("body")), clean_body(hi.get("body"))
    post = merge(en, pa, hi)
    validate(post, min_words)
    return post, words


def main():
    if not os.environ.get("GEMINI_API_KEY", "").strip():
        log("[WARN] GEMINI_API_KEY is not set - cannot write blogs.")
        return 1
    draft_mode = os.environ.get("HEALTH_BLOG_DRAFT", "false").strip().lower() == "true"
    today = datetime.now(IST).date()
    iso = today.isoformat()
    target = per_day(today)
    try:
        min_words = max(300, int(os.environ.get("HEALTH_BLOG_MIN_WORDS", "1200") or 1200))
    except ValueError:
        min_words = 1200

    data = load(DATA, {"tags": {}, "posts": []})
    drafts = load(DRAFTS, {"posts": []})
    everything = data["posts"] + drafts["posts"]
    done_today = sum(1 for p in everything if p.get("auto") and p.get("date") == iso)
    need = target - done_today
    log(f"[INFO] {iso} (IST): target {target} blogs/day (min {min_words} words each), already generated today: {done_today}, mode={'DRAFT (review)' if draft_mode else 'publish'}")
    if need <= 0:
        log("[OK] Today's blogs already exist - nothing to do.")
        return 0

    # least-recently-written topics first (ties keep the fixed topic order) -> clean rotation, no repeats
    last = {}
    for p in everything:
        last[p.get("tag")] = max(last.get(p.get("tag"), ""), p.get("date", ""))
    order = sorted(range(len(TOPICS)), key=lambda i: (last.get(TOPICS[i]["tag"], ""), i))
    skip = {t.strip() for t in os.environ.get("HEALTH_BLOG_SKIP_TAGS", "sexual-wellness").split(",") if t.strip() and t.strip().lower() != "none"}
    order = [i for i in order if TOPICS[i]["tag"] not in skip]
    chosen = [TOPICS[i] for i in order[:need]]
    hints = trending_hints()
    log("[INFO] Trending health searches (India): " + (", ".join(hints) if hints else "none found - using built-in keyword lists"))
    log("[INFO] Topics this run: " + ", ".join(t["name"] for t in chosen))

    used_slugs = {p["slug"] for p in everything}
    used_titles = {norm(p["title"]["en"]) for p in everything}
    used_keywords = {norm(p.get("keyword", "")) for p in everything if p.get("keyword")}
    state, made, quota_out = {"last_call": 0.0}, [], False
    for topic in chosen:
        avoid = [p["title"]["en"] for p in everything if p.get("tag") == topic["tag"]]
        post = words = None
        keyword = pick_keyword(topic, used_keywords, today)
        log(f"[INFO] {topic['name']}: target keyword -> {keyword}")
        for attempt in (1, 2):
            try:
                post, words = generate_post(topic, avoid, state, min_words, keyword, hints)
                if norm(post["title"]["en"]) in used_titles or any(similar(post["title"]["en"], t) for t in avoid):
                    raise ValueError("duplicate or too-similar title")
                break
            except QuotaExhausted as exc:
                log(f"[WARN] Gemini quota used up for today ({exc}). Keeping the blogs written so far; the next run continues.")
                quota_out = True
                post = None
                break
            except Exception as exc:
                log(f"[WARN] {topic['name']} attempt {attempt} failed: {exc}")
                post = None
        if not post:
            if quota_out:
                break
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
            "tag": topic["tag"], "minutes": max(3, round(words / 200)),
            "title": {k: post["title"][k].strip() for k in LANGS},
            "excerpt": {k: post["excerpt"][k].strip() for k in LANGS},
            "points": [{k: x[k].strip() for k in LANGS} for x in post["points"]],
            "faq": post["faq"], "keyword": post.get("keyword") or keyword, "keywords": post.get("keywords", []),
            "body": post["body"],
            "auto": True,
        }
        used_keywords.add(norm(entry["keyword"])); used_slugs.add(slug); used_titles.add(norm(entry["title"]["en"])); everything.append(entry); made.append(entry)
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
