"""
BÁ ĐAO (thức tỉnh) — đao khí bay: lấy vết chém trong ảnh mẫu tools/art/ref/ba_dao_wave_ref.png (vệt chém lưỡi liềm xanh
trên nền sàn), tách khỏi nền + nhân vật, ĐỔI MÀU sang tông tím hồng của vòng đao khí Bá Đao.

1) Tách: hiệu ứng là màu xanh tự phát sáng → độ đục = (độ sáng kênh xanh lam vượt nền) × (độ "xanh" so với đỏ);
   bỏ vùng nhân vật (tóc vàng, áo, thanh kiếm dựng đứng) — trừ lõi trắng của vệt chém mảnh chạy ngang qua người.
2) Đổi màu: lấy độ sáng làm chỉ số, ánh xạ qua dải tím đen → tím → hồng tím → trắng hồng (cùng bảng với vòng Bá Đao).
3) Cắt sát, thu về 384 px cạnh dài → public/vfx/ba_dao_wave.png.
   Hướng "phía trước" của lưỡi liềm (vuông góc dây cung, phía lồi) ≈ 60° → khi bay theo góc a thì xoay ảnh (a − 60°).

  python3 -I tools/art/ba_dao_wave.py → public/vfx/ba_dao_wave.png + tools/art/out/ba_dao_wave_preview.png
"""
import os
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
SIZE = 384
FORWARD_DEG = 60

# dải màu đích (độ sáng 0 → 1)
STOPS = [(0.00, (40, 10, 70)), (0.30, (100, 28, 170)), (0.55, (176, 52, 232)), (0.75, (236, 100, 246)),
         (0.90, (255, 180, 252)), (1.00, (255, 246, 255))]


def ramp(t):
    t = np.clip(t, 0, 1)
    out = np.zeros(t.shape + (3,))
    for (a, ca), (b, cb) in zip(STOPS, STOPS[1:]):
        m = (t >= a) & (t <= b)
        k = ((t - a) / (b - a))[m][:, None]
        out[m] = np.array(ca) * (1 - k) + np.array(cb) * k
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    src = Image.open(os.path.join(HERE, 'ref', 'ba_dao_wave_ref.png')).convert('RGB')
    im = np.array(src).astype(float)
    R, G, B = im[..., 0], im[..., 1], im[..., 2]
    alpha = np.clip((B - 88) / 100, 0, 1) * np.clip((B - R - 40) / 60, 0, 1)
    # lõi trắng xanh (R, G, B đều cao) cũng là hiệu ứng — không để thành lỗ đen ở mép sáng
    alpha = np.maximum(alpha, np.clip((np.minimum(np.minimum(R, G), B) - 140) / 60, 0, 1) * (B > 200))
    # bỏ nhân vật + thanh kiếm dựng đứng (giữ lõi rất sáng của vệt chém mảnh băng ngang qua người)
    mk = Image.new('L', src.size, 0)
    dr = ImageDraw.Draw(mk)
    dr.polygon([(238, 180), (300, 168), (352, 205), (350, 250), (300, 262), (240, 262)], fill=255)   # chỉ phần người phía trên lưỡi liềm
    dr.rectangle((252, 108, 272, 200), fill=255)
    person = np.array(mk) > 0
    bright = (R > 170) & (G > 220) & (B > 235)
    alpha[person & ~bright] = 0
    lum = np.clip((G - 55) / 200, 0, 1)                     # kênh lục tách rõ lõi sáng (xanh trắng) với thân (xanh lam)
    col = ramp(lum ** 0.9)
    rgba = np.dstack([col, alpha * 255]).astype(np.uint8)
    img = Image.fromarray(rgba, 'RGBA')
    bb = img.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    img = img.crop((bb[0] - 6, bb[1] - 6, bb[2] + 6, bb[3] + 6))
    k = SIZE / max(img.size)
    img = img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
    img.save(os.path.join(ROOT, 'public', 'vfx', 'ba_dao_wave.png'))
    pv = Image.new('RGBA', (img.width * 2 + 30, img.height + 20), (26, 24, 40, 255))
    ref = src.crop((bb[0] - 6, bb[1] - 6, bb[2] + 6, bb[3] + 6)).resize(img.size, Image.LANCZOS).convert('RGBA')
    pv.alpha_composite(ref, (10, 10))
    pv.alpha_composite(img, (20 + img.width, 10))
    pv.save(os.path.join(OUT, 'ba_dao_wave_preview.png'))
    print('ok', img.size)


if __name__ == '__main__':
    main()
