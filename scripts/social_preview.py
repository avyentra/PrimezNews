"""Generate same-origin social thumbnails; the article keeps its original hero."""
import hashlib
import io
import logging
import re
from urllib.error import URLError
from urllib.request import urlopen

from PIL import Image, ImageOps, UnidentifiedImageError

SIZE = (1200, 630)
LIMIT = 8 * 1024 * 1024
MAX_CARD = 280 * 1024
KEEP_OLD = 3


def share_folder(root):
    folder = root / 'assets' / 'images' / 'share'
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def preview(root, article_dir, source, base, storage_origin):
    fallback = base + 'assets/images/og-image.jpg'
    try:
        if source.startswith(base + 'assets/images/') and re.fullmatch(r'[\w-]+\.webp', source.split('/')[-1]):
            raw = (root / 'assets' / 'images' / source.split('/')[-1]).read_bytes()
        elif source.startswith(storage_origin + '/storage/v1/object/public/newsroom-media/') or source.startswith(storage_origin + '/storage/v1/object/public/journalist-media/'):
            with urlopen(source, timeout=15) as response:
                raw = response.read(LIMIT + 1)
        else:
            return fallback
        if len(raw) > LIMIT:
            raise ValueError('source exceeds size limit')
        with Image.open(io.BytesIO(raw)) as image:
            if image.width * image.height > 40_000_000:
                raise ValueError('source exceeds pixel limit')
            thumbnail = ImageOps.fit(ImageOps.exif_transpose(image).convert('RGB'), SIZE)
        # WhatsApp shows the big photo only for small files: keep every card under ~280 KB
        for quality in (80, 72, 64, 56, 50):
            output = io.BytesIO()
            thumbnail.save(output, 'JPEG', quality=quality, optimize=True, progressive=False)
            data = output.getvalue()
            if len(data) <= MAX_CARD:
                break
        digest = hashlib.sha256(data).hexdigest()[:16]
        share_dir = share_folder(root)
        filename = article_dir.name + '--' + digest + '.jpg'      # all photos live in assets/images/
        target = share_dir / filename
        if not target.exists():
            target.write_bytes(data)
        # Never delete a card that may already be cached by WhatsApp/Facebook:
        # keep the newest KEEP_OLD cards, remove only older extras.
        cards = sorted(share_dir.glob(article_dir.name + '--*.jpg'), key=lambda f: f.stat().st_mtime, reverse=True)
        for old in [c for c in cards if c.name != filename][KEEP_OLD:]:
            old.unlink()
        return base + str(target.relative_to(root))
    except (OSError, URLError, ValueError, Image.DecompressionBombError, UnidentifiedImageError) as error:
        logging.warning('Thumbnail for %s: %s', article_dir.name, type(error).__name__)
        previous = next(share_folder(root).glob(article_dir.name + '--*.jpg'), None)
        return base + str(previous.relative_to(root)) if previous else fallback
