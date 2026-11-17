"""Automatic image slimming for the website's own photos (assets/ folder).

Runs in GitHub (.github/workflows/optimize-images.yml) whenever photos are added or changed:
any photo that is too wide or too heavy is resized/re-compressed IN PLACE (same file name,
same format), so no page link changes.  Run locally:  python scripts/optimize_images.py
Use  --check  to only report (exit code 1 if something is too heavy).
"""
import io
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets' / 'images'   # all website photos live here
MAX_SIDE = 1600            # px, longest side for normal photos
MAX_SIDE_LOGO = 700
MAX_SIDE_AD = 2200         # festive / campaign banners
LIMIT_KB = 200             # same budget as tests/test_performance.py
LIMIT_KB_LOGO = 60
SKIP = {'og-image.jpg'}    # social card, has its own size rules


def rules(path):
    name = path.name.lower()
    if 'logo' in name:
        return MAX_SIDE_LOGO, LIMIT_KB_LOGO
    if name.startswith(('custom-ad', 'ad-', 'festive')):
        return MAX_SIDE_AD, LIMIT_KB
    return MAX_SIDE, LIMIT_KB


def encode(img, fmt, quality):
    buf = io.BytesIO()
    if fmt == 'WEBP':
        img.save(buf, 'WEBP', quality=quality, method=6)
    elif fmt == 'JPEG':
        img.convert('RGB').save(buf, 'JPEG', quality=quality, optimize=True, progressive=True)
    else:  # PNG: lossless, keep transparency
        img.save(buf, 'PNG', optimize=True)
    return buf.getvalue()


def slim(path):
    """Return (old_bytes, new_bytes) if the file was changed, else None."""
    max_side, limit_kb = rules(path)
    old = path.stat().st_size
    with Image.open(path) as src:
        fmt = (src.format or '').upper()
        if fmt not in ('WEBP', 'JPEG', 'PNG') or getattr(src, 'is_animated', False):
            return None
        img = ImageOps.exif_transpose(src)
        too_wide = max(img.size) > max_side
        if not too_wide and old <= limit_kb * 1024:
            return None
        if too_wide:
            img.thumbnail((max_side, max_side), Image.LANCZOS)
        best = None
        for q in (80, 74, 68, 62, 56, 50):
            data = encode(img, fmt, q)
            best = data
            if len(data) <= limit_kb * 1024 or fmt == 'PNG':
                break
    if best is None or len(best) >= old:
        return None
    path.write_bytes(best)
    return old, len(best)


def used_names():
    """Only photos the website actually uses (master/original files nobody links are left alone)."""
    import re
    text = ''
    for f in [*ROOT.glob('*.html'), *(ROOT / 'news').glob('*/index.html'), *(ROOT / 'assets').glob('css/*.css'), *(ROOT / 'assets').glob('js/*.js'), *(ROOT / 'health-blog').glob('**/*.html'), ROOT / 'data' / 'health-blog.json']:
        text += f.read_text(errors='ignore')
    return set(re.findall(r'([A-Za-z0-9_-]+\.(?:webp|jpe?g|png))', text))


def main(check_only=False):
    changed, heavy = [], []
    used = used_names()
    for path in sorted(ASSETS.glob('*')):
        if path.suffix.lower() not in ('.webp', '.jpg', '.jpeg', '.png') or path.name in SKIP or path.name not in used:
            continue
        max_side, limit_kb = rules(path)
        if check_only:
            with Image.open(path) as im:
                if path.stat().st_size > limit_kb * 1024 or max(im.size) > max_side:
                    heavy.append(f'{path.name}: {path.stat().st_size // 1024} KB {im.size[0]}x{im.size[1]}')
            continue
        result = slim(path)
        if result:
            changed.append(f'{path.name}: {result[0] // 1024} KB -> {result[1] // 1024} KB')
    for line in changed or heavy:
        print(line)
    if check_only:
        return 1 if heavy else 0
    print(f'{len(changed)} image(s) made lighter')
    return 0


if __name__ == '__main__':
    sys.exit(main('--check' in sys.argv))
