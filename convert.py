# pip install pillow
from PIL import Image
import os

folder = 'reciter'
for f in os.listdir(folder):
    name, ext = os.path.splitext(f)
    if ext.lower() in ('.jpg', '.jpeg', '.png') and f != 'qori.png':
        im = Image.open(os.path.join(folder, f))
        if im.mode not in ('RGB', 'RGBA'):
            im = im.convert('RGBA')
        im.thumbnail((320, 320))  # ekran uchun yetarli, 2x retina bilan
        im.save(os.path.join(folder, name + '.webp'), 'WEBP', quality=80, method=6)
        print('OK', f)
