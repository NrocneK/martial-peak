"""
LINH KHÍ ĐẠN (thức tỉnh) — tia linh khí, vẽ mới theo kiểu dáng ảnh mẫu (không cắt ảnh vì có watermark tác giả):
  vệt sáng thon nhọn: đầu (phía +x) to tròn sáng rực lõi trắng, đuôi mảnh dần về sau, viền xanh lam, quầng mờ;
  vài hạt sáng lấm tấm dọc đuôi. Vòng hào quang ở gốc vẽ trong code (elip mỏng bung ra).
  → public/vfx/orb_bolt.png (256×40, mũi ở mép phải)

  python3 -I tools/art/orb_bolt.py
"""
import os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
W, H, SS = 256, 40, 3
STOPS = [(0.0, (20, 70, 200)), (0.45, (40, 140, 255)), (0.75, (120, 210, 255)), (0.9, (210, 245, 255)), (1.0, (255, 255, 255))]


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
    yy, xx = np.mgrid[0:H * SS, 0:W * SS].astype(float)
    x = (xx + 0.5) / (W * SS)                        # 0 đuôi … 1 mũi
    y = (yy + 0.5) / (H * SS) - 0.5
    head = 0.9
    half = np.where(x < head, 0.34 * (x / head) ** 2.2, 0.34 * np.sqrt(np.clip(1 - ((x - head) / (1 - head)) ** 2, 0, 1)))
    d = np.abs(y) / np.maximum(half, 1e-4)
    body = np.clip(1 - d, 0, 1)
    core = np.clip(1 - d * 1.8, 0, 1) * np.clip((x - 0.25) / 0.5, 0, 1)
    t = np.clip(0.35 + 0.4 * body + 0.6 * core, 0, 1)
    a = np.clip(body * 1.4, 0, 1) * np.clip(x / 0.35, 0, 1) ** 0.8
    # hạt sáng dọc đuôi
    rng = np.random.default_rng(4)
    for _ in range(9):
        px, py = rng.uniform(0.05, 0.55), rng.normal(0, 0.06)
        dd = np.hypot((x - px) * W, (y - py) * H)
        sp = np.exp(-(dd / 1.6) ** 2)
        t = np.maximum(t, sp * 0.9)
        a = np.maximum(a, sp * 0.9)
    col = ramp(t)
    rgba = np.dstack([col, a * 255]).reshape(H, SS, W, SS, 4)
    al = rgba[..., 3:4]
    prem = (rgba[..., :3] * al).mean((1, 3))
    am = al.mean((1, 3))
    img = Image.fromarray(np.clip(np.dstack([prem / np.maximum(am, 1e-3), am]), 0, 255).astype(np.uint8), 'RGBA')
    g = np.array(img.filter(ImageFilter.GaussianBlur(4))).astype(float)
    g[..., :3] = (40, 130, 255)
    g[..., 3] *= 0.85
    out = Image.fromarray(g.astype(np.uint8), 'RGBA')
    out.alpha_composite(img)
    out.save(os.path.join(ROOT, 'public', 'vfx', 'orb_bolt.png'))
    pv = Image.new('RGBA', (W * 2 + 20, H * 2 + 20), (8, 8, 14, 255))
    pv.alpha_composite(out.resize((W * 2, H * 2), Image.LANCZOS), (10, 10))
    pv.save(os.path.join(OUT, 'orb_bolt_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
