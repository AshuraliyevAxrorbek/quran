from PIL import Image, ImageOps
import os

folder = 'reciter'
for f in os.listdir(folder):
    name, ext = os.path.splitext(f)
    if ext.lower() not in ('.jpg', '.jpeg', '.png'):
        continue
    out = os.path.join(folder, name + '.webp')
    if os.path.exists(out):
        continue  # allaqachon bor, qayta o'tkazmaydi
    im = Image.open(os.path.join(folder, f))
    im = ImageOps.exif_transpose(im)
    if im.mode not in ('RGB', 'RGBA'):
        im = im.convert('RGBA')
    im.thumbnail((320, 320))
    im.save(out, 'WEBP', quality=80, method=6)
    print('OK', f)
