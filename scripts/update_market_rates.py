"""Refresh the latest dated Chandigarh retail quotes, keeping last-good values."""
import json
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from html import unescape
from pathlib import Path
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

DATA = Path(__file__).resolve().parents[1] / 'data/market-rates.json'
SOURCES = {
    'gold': 'https://www.goodreturns.in/gold-rates/chandigarh.html',
    'petrol': 'https://www.goodreturns.in/petrol-price-in-chandigarh.html',
    'diesel': 'https://www.goodreturns.in/diesel-price-in-chandigarh.html',
}


def plain(markup):
    return ' '.join(unescape(re.sub(r'<[^>]*>', ' ', markup)).split())


def parse(kind, markup):
    title = plain(re.search(r'<title>(.*?)</title>', markup, re.S | re.I)[1])
    if 'Chandigarh' not in title or kind not in title.lower():
        raise ValueError('Unexpected city or commodity')
    date = re.search(r'\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+),?\s+(\d{4})\b', title)
    day = datetime.strptime(f'{date[1]} {date[2][:3]} {date[3]}', '%d %b %Y').date()
    if day > datetime.now(ZoneInfo('Asia/Kolkata')).date():
        raise ValueError('Future quote date')
    if kind == 'gold':
        for table in re.findall(r'<table\b[^>]*>(.*?)</table>', markup, re.S | re.I):
            rows = [[plain(c) for c in re.findall(r'<t[hd]\b[^>]*>(.*?)</t[hd]>', row, re.S | re.I)]
                    for row in re.findall(r'<tr\b[^>]*>(.*?)</tr>', table, re.S | re.I)]
            if rows and rows[0][:2] == ['Gram', '24K']:
                cell = next(row[1] for row in rows[1:] if row[0] == '10')
                amount = re.match(r'^₹\s*([\d,]+(?:\.\d+)?)', cell)[1]
                break
        else:
            raise ValueError('Missing 24K 10 gram rate')
    else:
        amount = re.search(r'Rs\.\s*([\d,]+\.\d{2})\s*/\s*Ltr', title, re.I)[1]
    price = float(amount.replace(',', ''))
    if price <= 0:
        raise ValueError('Invalid price')
    return {'price':price, 'date':day.isoformat(), 'source':SOURCES[kind]}


def fetch(kind):
    with urlopen(Request(SOURCES[kind], headers={'User-Agent':'PrimezNews market rates/1.0'}), timeout=30) as response:
        return parse(kind, response.read().decode('utf-8'))


def main():
    rates = json.loads(DATA.read_text()) if DATA.exists() else {}
    failed = []
    with ThreadPoolExecutor(3) as pool:
        tasks = {kind:pool.submit(fetch, kind) for kind in SOURCES}
        for kind, task in tasks.items():
            try:
                quote = task.result()
                if quote['date'] < rates.get(kind, {}).get('date', ''):
                    raise ValueError('Older than saved quote')
                rates[kind] = quote
            except Exception as error:
                print(kind, type(error).__name__, file=sys.stderr)
                failed.append(kind)
    if rates:
        DATA.write_text(json.dumps(rates, indent=2) + '\n')
    return bool(failed)


if __name__ == '__main__':
    sys.exit(main())
