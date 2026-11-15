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


def preview(root, article_dir, source, base, storage_origin):
    fallback = base + 'assets/og-image.jpg'
    try:
        if source.startswith(base + 'assets/') and re.fullmatch(r'[\w-]+\.webp', source.split('/')[-1]):
            raw = (root / 'assets' / source.split('/')[-1]).read_bytes()
        elif source.startswith(storage_origin + '/storage/v1/object/public/newsroom-media/'):
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
        output = io.BytesIO()
        thumbnail.save(output, 'JPEG', quality=80, optimize=True)
        data = output.getvalue()
        digest = hashlib.sha256(data).hexdigest()[:16]
        filename = 'share-' + digest + '.jpg'
        (article_dir / filename).write_bytes(data)
        for old in article_dir.glob('share-*.jpg'):
            if old.name != filename:
                old.unlink()
        return base + str((article_dir / filename).relative_to(root))
    except (OSError, URLError, ValueError, Image.DecompressionBombError, UnidentifiedImageError) as error:
        logging.warning('Thumbnail for %s: %s', article_dir.name, type(error).__name__)
        previous = next(article_dir.glob('share-*.jpg'), None)
        return base + str(previous.relative_to(root)) if previous else fallback
