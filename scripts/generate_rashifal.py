#!/usr/bin/env python3
"""Generate validated Hindi entertainment copy. Never overwrite good data on failure."""
import datetime
import json
import os
import pathlib
import re
import sys
import tempfile
import time
import urllib.error
import urllib.request
import zoneinfo

API_URL = "https://api.anthropic.com/v1/messages"
MODEL = os.environ.get("RASHIFAL_MODEL", "claude-haiku-5-5")
SIGNS = ["मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या", "तुला", "वृश्चिक", "धनु", "मकर", "कुंभ", "मीन"]
PERIODS = ["daily", "weekly", "monthly", "yearly"]
TOPICS = ["career", "money", "love", "family", "health", "remedy"]
COLORS = ["नारंगी", "पीला", "लाल", "हरा", "नीला", "सफेद", "गुलाबी", "बैंगनी", "सुनहरा", "आसमानी"]
PROMPT = """PrimezNews के लिए हिंदी में सामान्य मनोरंजन राशिफल लिखो। तारीख {day} IST; राशि {sign}।
यह ज्योतिषीय गणना नहीं है; ग्रहों/पंचांग के वास्तविक स्थान या वैज्ञानिक प्रमाण का दावा मत करो।
स्वास्थ्य/निवेश के निश्चित परिणाम, इलाज, डर, महंगे उपाय या चमत्कार का दावा मत करो।
रोजमर्रा के संतुलित सुझाव दो। राशि के लिए दैनिक, इस सप्ताह, इस महीने और इस वर्ष का अलग संदर्भ दो।
केवल JSON: {{"daily":"3 छोटे वाक्य", "weekly":"3 छोटे वाक्य", "monthly":"3 छोटे वाक्य", "yearly":"3 छोटे वाक्य",
"details":{{"career":"छोटा सुझाव", "money":"छोटा सुझाव", "love":"छोटा सुझाव", "family":"छोटा सुझाव", "health":"सामान्य स्वास्थ्य सुझाव", "remedy":"बिना खर्च की सकारात्मक गतिविधि", "lucky_number":1, "lucky_color":"{colors}"}}}}
lucky_number पूर्णांक 1–9; lucky_color ऊपर दी सूची में से केवल एक। शुभ समय मत बनाओ।"""


def ist_today():
    return datetime.datetime.now(zoneinfo.ZoneInfo("Asia/Kolkata")).date()


def text(value, limit):
    if not isinstance(value, str) or not value.strip() or len(value) > limit or not re.search(r"[\u0900-\u097f]", value):
        raise ValueError("Missing, oversized or non-Hindi content")
    if re.search(r"placeholder|dummy|परीक्षण", value, re.I):
        raise ValueError("Test content cannot be published")
    return value.strip()


def validate_sign(data):
    if not isinstance(data, dict):
        raise ValueError("Invalid sign object")
    result = {period: text(data.get(period), 2000) for period in PERIODS}
    details = data.get("details")
    if not isinstance(details, dict):
        raise ValueError("Missing topic cards")
    cleaned = {key: text(details.get(key), 300) for key in TOPICS}
    number = details.get("lucky_number")
    if type(number) is not int or not 1 <= number <= 9 or details.get("lucky_color") not in COLORS:
        raise ValueError("Invalid lucky indicators")
    cleaned.update(lucky_number=number, lucky_color=details["lucky_color"])
    result["details"] = cleaned
    return result


def ask_model(sign, day, key):
    body = json.dumps({"model": MODEL, "max_tokens": 2400, "messages": [{"role": "user", "content": PROMPT.format(day=day.isoformat(), sign=sign, colors=" / ".join(COLORS))}]}).encode()
    for attempt in range(3):
        req = urllib.request.Request(API_URL, data=body, headers={"content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01"})
        try:
            with urllib.request.urlopen(req, timeout=75) as response:
                payload = json.load(response)
            break
        except urllib.error.HTTPError as error:
            if error.code not in (429, 500, 502, 503, 529) or attempt == 2:
                raise RuntimeError("AI API request failed (HTTP %s)" % error.code) from None
        except (urllib.error.URLError, TimeoutError):
            if attempt == 2:
                raise RuntimeError("AI API connection failed") from None
        time.sleep(2 ** (attempt + 1))
    if payload.get("stop_reason") != "end_turn":
        raise ValueError("Incomplete AI response")
    reply = "".join(block.get("text", "") for block in payload.get("content", []) if block.get("type") == "text").strip()
    if reply.startswith('```'):
        reply = re.sub(r'^```(?:json)?\s*|\s*```$', '', reply)
    return validate_sign(json.loads(reply))


def atomic_write(path, content):
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, delete=False) as handle:
            temporary = pathlib.Path(handle.name)
            handle.write(content)
        temporary.replace(path)
    finally:
        if temporary and temporary.exists():
            temporary.unlink()


def generate(day, key, output, ask=ask_model, provider="anthropic"):
    # Build and validate every sign before touching either published file.
    signs = {sign: validate_sign(ask(sign, day, key)) for sign in SIGNS}
    labels = {"curated": "स्वचालित सामान्य मार्गदर्शन · AI या ग्रह-गणना आधारित नहीं",
              "gochar": "ग्रह-गोचर (वैदिक पद्धति, लाहिड़ी अयनांश) की गणना पर आधारित सामान्य मार्गदर्शन · ज्योतिषीय मान्यता, केवल मनोरंजन के लिए",
              "anthropic": "AI द्वारा तैयार (Claude)"}
    result = {"date": day.isoformat(), "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(), "generated_by": labels[provider], "content_type": "entertainment", "provider": provider, "model": MODEL if provider == "anthropic" else None, "signs": signs}
    if provider == "gochar":
        from graha_gochar import positions_summary
        result["positions"] = positions_summary(day)
    content = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    output.mkdir(parents=True, exist_ok=True)
    atomic_write(output / (day.isoformat() + '.json'), content)
    atomic_write(output / 'latest.json', content)
    return result


def guidance_wrapper(sign, day, key):
    from rashifal_free import guidance
    return guidance(sign, day)


def gochar_wrapper(sign, day, key):
    from graha_gochar import guidance
    return guidance(sign, day)


def main():
    provider = os.environ.get('RASHIFAL_PROVIDER', 'gochar')
    if provider not in ('curated', 'gochar', 'anthropic'):
        sys.exit('Unsupported Rashifal provider')
    key = os.environ.get('ANTHROPIC_API_KEY', '')
    if provider == 'anthropic' and not key:
        sys.exit('Missing GitHub Secret: ANTHROPIC_API_KEY. No data changed.')
    day = ist_today()
    output = pathlib.Path(os.environ.get('RASHIFAL_OUT', 'data/rashifal'))
    try:
        existing = json.loads((output / 'latest.json').read_text(encoding='utf-8'))
        if existing.get('date') == day.isoformat() and existing.get('content_type') == 'entertainment' and existing.get('provider') == provider:
            for sign in SIGNS:
                validate_sign(existing['signs'][sign])
            print('Validated content for today already exists; no API calls needed.')
            return
    except (OSError, ValueError, KeyError, TypeError):
        pass
    try:
        if provider == "curated":
            generate(day, "", output, guidance_wrapper, provider="curated")
        elif provider == "gochar":
            generate(day, "", output, gochar_wrapper, provider="gochar")
        else:
            generate(day, key, output)
    except Exception:
        sys.exit('Generation failed or returned invalid content. Previous published data preserved. Check provider quota/model availability; secrets and AI replies are not logged.')
    print('Generated and validated all 12 signs for', day.isoformat())


if __name__ == '__main__':
    main()
