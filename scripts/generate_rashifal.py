#!/usr/bin/env python3
"""Generate the daily rashifal (all 12 signs, four periods) with the Anthropic API.

Writes data/rashifal/YYYY-MM-DD.json and data/rashifal/latest.json.
Run from the repository root:  ANTHROPIC_API_KEY=... python3 scripts/generate_rashifal.py
Set RASHIFAL_DRY_RUN=1 to write placeholder text without calling the API (for testing).
"""
import datetime
import json
import os
import pathlib
import re
import sys
import urllib.request
import zoneinfo

API_URL = "https://api.anthropic.com/v1/messages"
MODEL = os.environ.get("RASHIFAL_MODEL", "claude-haiku-5-5")
OUT_DIR = pathlib.Path(os.environ.get("RASHIFAL_OUT", "data/rashifal"))
SIGNS = ["मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या",
         "तुला", "वृश्चिक", "धनु", "मकर", "कुंभ", "मीन"]
KEYS = ["daily", "weekly", "monthly", "yearly"]

PROMPT = """तुम पंजाबी न्यूज़ पोर्टल PrimezNews के लिए राशिफल लिखते हो।
आज की तारीख: {day} (भारतीय समय)। राशि: {sign}।
हिंदी में लिखो। सकारात्मक, संतुलित और सामान्य भाषा में। डर या चमत्कारी दावे मत करो।
स्वास्थ्य, पैसे या कानूनी मामलों में पक्की भविष्यवाणी मत करो।
केवल JSON लौटाओ, किसी और शब्द के बिना, इस आकार में:
{{"daily": "आज का राशिफल, 3-4 वाक्य", "weekly": "इस सप्ताह का राशिफल, 3-4 वाक्य",
"monthly": "इस महीने का राशिफल, 3-4 वाक्य", "yearly": "इस वर्ष का राशिफल, 3-4 वाक्य"}}"""


def ist_today():
    return datetime.datetime.now(zoneinfo.ZoneInfo("Asia/Kolkata")).date()


def ask_model(sign, day, key):
    body = json.dumps({
        "model": MODEL,
        "max_tokens": 900,
        "messages": [{"role": "user", "content": PROMPT.format(day=day.isoformat(), sign=sign)}],
    }).encode("utf-8")
    req = urllib.request.Request(API_URL, data=body, method="POST", headers={
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
    })
    with urllib.request.urlopen(req, timeout=60) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    text = "".join(block.get("text", "") for block in payload.get("content", []))
    match = re.search(r"\{.*\}", text, re.S)
    if not match:
        raise ValueError("no JSON in model reply for " + sign)
    data = json.loads(match.group(0))
    if not all(isinstance(data.get(k), str) and data[k].strip() for k in KEYS):
        raise ValueError("incomplete JSON for " + sign)
    return {k: data[k].strip() for k in KEYS}


def placeholder(sign, day):
    return {k: f"{sign} {k} राशिफल ({day.isoformat()}) — परीक्षण के लिए placeholder।" for k in KEYS}


def main():
    day = ist_today()
    dry = os.environ.get("RASHIFAL_DRY_RUN") == "1"
    key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not dry and not key:
        sys.exit("ANTHROPIC_API_KEY is not set")

    signs = {}
    for sign in SIGNS:
        try:
            signs[sign] = placeholder(sign, day) if dry else ask_model(sign, day, key)
        except Exception as exc:  # keep yesterday's file if anything fails
            sys.exit(f"failed for {sign}: {exc}")

    result = {
        "date": day.isoformat(),
        "generated_by": "AI (Claude)",
        "signs": signs,
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    text = json.dumps(result, ensure_ascii=False, indent=2)
    (OUT_DIR / f"{day.isoformat()}.json").write_text(text, encoding="utf-8")
    (OUT_DIR / "latest.json").write_text(text, encoding="utf-8")
    print("wrote", OUT_DIR / "latest.json", "for", day.isoformat())


if __name__ == "__main__":
    main()
