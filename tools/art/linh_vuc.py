"""
TIÊN VƯƠNG LĨNH VỰC — trận đồ dưới chân, lấy NGUYÊN từ ảnh mẫu:
  · tools/art/ref/linh_vuc_gold_ref.webp (trận đồ vàng, nền nâu đen có vân) → trừ màu nền rồi thành ảnh cộng sáng
      → linh_vuc_gold.png 512 (bản thường)
      → linh_vuc_red.png  512 (bản thức tỉnh: đổi màu sang đỏ theo độ sáng, lõi vẫn sáng trắng-hồng)
  · tools/art/ref/linh_vuc_red_ring_ref.png (vòng gai đỏ, nền đen) → linh_vuc_ring.png 512 (vòng ngoài khi thức tỉnh)
  Mép tròn làm mềm để không lộ khung. Game ép dẹt theo mặt đất + xoay, chế độ ADD.
  python3 -I tools/art/linh_vuc.py
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VFX = os.path.join(ROOT, 'public', 'vfx')
OUT = os.path.join(HERE, 'out')
REF = os.path.join(HERE, 'ref')
RED = np.array([[0.0, 0, 0, 0], [0.3, 120, 6, 10], [0.6, 225, 30, 30], [0.85, 255, 110, 90], [1.0, 255, 225, 210]], float)


def additive(a):
    A = a.max(2) / 255
    col = a / np.maximum(A[..., None], 1e-3)
    return np.dstack([np.clip(col, 0, 255), A * 255]).astype(np.uint8)


def crop_round(a, cx, cy, R, edge=0.05):
    a = a[cy - R:cy + R, cx - R:cx + R]
    yy, xx = np.mgrid[0:2 * R, 0:2 * R].astype(float)
    r = np.hypot(xx - R, yy - R) / R
    return a * np.clip((1 - r) / edge, 0, 1)[..., None]


def save(arr, name):
    img = Image.fromarray(additive(arr), 'RGBA').resize((512, 512), Image.LANCZOS)
    img.save(os.path.join(VFX, name))
    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    g = np.array(Image.open(os.path.join(REF, 'linh_vuc_gold_ref.webp')).convert('RGB')).astype(float)
    g = np.clip((g - np.array([50, 42, 32.])) * 255 / (255 - np.array([50, 42, 32.])), 0, 255)   # trừ nền nâu đen
    g = crop_round(g, 365, 366, 330)
    gold = save(g, 'linh_vuc_gold.png')
    lum = g.max(2) / 255
    red = np.zeros_like(g)
    for c in range(3):
        red[..., c] = np.interp(lum, RED[:, 0], RED[:, c + 1])
    redi = save(red, 'linh_vuc_red.png')
    r = np.array(Image.open(os.path.join(REF, 'linh_vuc_red_ring_ref.png')).convert('RGB')).astype(float)
    r = np.clip((r - 4) * 255 / 251, 0, 255)
    ring = save(crop_round(r, 368, 368, 368, 0.02), 'linh_vuc_ring.png')
    pv = Image.new('RGBA', (1536, 512), (26, 24, 40, 255))
    for i, im in enumerate((gold, redi, ring)):
        pv.alpha_composite(im, (i * 512, 0))
    pv.convert('RGB').resize((1152, 384), Image.LANCZOS).save(os.path.join(OUT, 'linh_vuc_preview.png'))


if __name__ == '__main__':
    main()
