"""
NGÂN HÀ HÀN LƯU — KHỐI BĂNG ĐÓNG BĂNG lấy NGUYÊN từ ảnh mẫu tools/art/ref/ngan_ha_ice_ref.jpg (5 mẫu A–E, nền trắng)
  · mặt nạ tách nền: rembg birefnet-general → tools/art/ref/ngan_ha_ice_mask.png
  · viền: gỡ nền trắng (F = a·C + (1-a)·255 → C) để không bị viền trắng trên nền tối
  · giữ nguyên màu; hơi trong suốt (0.92) để thấy mờ quái bên trong
  → public/vfx/ngan_ha_ice_{a..e}.png  (cao 180, gốc = đáy giữa)
  python3 -I tools/art/ngan_ha_ice.py
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VFX = os.path.join(ROOT, 'public', 'vfx')
OUT = os.path.join(HERE, 'out')
REF = os.path.join(HERE, 'ref')
# khung từng mẫu (x0, y0, x1, y1) — tránh chữ A–E
BOX = {'a': (45, 69, 217, 289), 'b': (241, 55, 457, 299), 'c': (466, 68, 669, 304),
       'd': (135, 364, 352, 594), 'e': (413, 363, 611, 594)}
H = 180


def main():
    os.makedirs(OUT, exist_ok=True)
    a = np.array(Image.open(os.path.join(REF, 'ngan_ha_ice_ref.jpg')).convert('RGB')).astype(float)
    m = np.array(Image.open(os.path.join(REF, 'ngan_ha_ice_mask.png')).convert('L')).astype(float) / 255
    m = np.clip((m - 0.04) / 0.9, 0, 1)
    for lx, ly in ((60, 56), (278, 64), (490, 58), (152, 368), (446, 378)):   # xoá chữ A–E
        m[ly - 18:ly + 18, lx - 16:lx + 16] = 0
    pv = Image.new('RGBA', (5 * 150, 200), (26, 24, 40, 255))
    for i, (k, (x0, y0, x1, y1)) in enumerate(BOX.items()):
        F, A = a[y0:y1, x0:x1], m[y0:y1, x0:x1].copy()
        lab, n = ndimage.label(A > 0.3)                                   # bỏ vụn lạ, giữ các mảnh băng đủ lớn
        if n:
            keep = np.isin(lab, [j + 1 for j, s in enumerate(ndimage.sum(A > 0.3, lab, range(1, n + 1))) if s > 25])
            A *= ndimage.gaussian_filter(ndimage.binary_dilation(keep, iterations=3).astype(float), 1)
        C = (F - (1 - A[..., None]) * 255) / np.maximum(A[..., None], 0.05)   # gỡ nền trắng ở viền
        C = np.where(A[..., None] > 0.97, F, C)
        A = A * 0.92
        ys, xs = np.nonzero(A > 0.05)
        img = Image.fromarray(np.dstack([np.clip(C, 0, 255), A * 255]).astype(np.uint8), 'RGBA')
        img = img.crop((xs.min() - 2, ys.min() - 2, xs.max() + 3, ys.max() + 3))
        img = img.resize((round(img.width * H / img.height), H), Image.LANCZOS)
        img.save(os.path.join(VFX, f'ngan_ha_ice_{k}.png'))
        print(k, img.size)
        t = img.resize((round(img.width * 0.8), round(img.height * 0.8)), Image.LANCZOS)
        pv.alpha_composite(t, (i * 150 + (150 - t.width) // 2, 200 - t.height - 8))
    pv.resize((pv.width * 2, pv.height * 2), Image.LANCZOS).convert('RGB').save(os.path.join(OUT, 'ngan_ha_ice_preview.png'))


if __name__ == '__main__':
    main()
