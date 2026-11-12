"""
LINH KHÍ ĐẠN — quả cầu linh khí xoáy (vẽ mới bằng công thức, phong cách riêng của game):
  lõi trắng sáng · các luồng xoắn ốc quay quanh tâm (nhiều lớp, tốc độ khác nhau) · vỏ cầu trong suốt có viền sáng ·
  vài vòng gió mỏng nghiêng quanh vỏ. Tông xanh ngọc - xanh lam.
  → public/vfx/spirit_orb.png: dải 12 khung 96×96 (lặp vòng, 24 khung/giây)

  python3 -I tools/art/spirit_orb.py
"""
import math
import os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
N, S, SS = 12, 96, 3
STOPS = [(0.0, (10, 40, 90)), (0.35, (30, 120, 220)), (0.6, (80, 200, 255)), (0.82, (180, 245, 255)), (1.0, (255, 255, 255))]


def ramp(t):
    t = np.clip(t, 0, 1)
    out = np.zeros(t.shape + (3,))
    for (a, ca), (b, cb) in zip(STOPS, STOPS[1:]):
        m = (t >= a) & (t <= b)
        k = ((t - a) / (b - a))[m][:, None]
        out[m] = np.array(ca) * (1 - k) + np.array(cb) * k
    return out


def frame(ph):
    n = S * SS
    yy, xx = np.mgrid[0:n, 0:n].astype(float)
    x, y = (xx + 0.5) / n * 2 - 1, (yy + 0.5) / n * 2 - 1
    r = np.hypot(x, y)
    th = np.arctan2(y, x)
    R = 0.62
    inside = r < R
    rr = r / R
    # luồng xoắn ốc: góc lệch theo bán kính (cuốn vào tâm), 3 lớp quay khác tốc
    sw = np.zeros_like(r)
    for arms, twist, spd, w in ((3, 5.0, 1.0, 0.5), (5, 8.0, -1.6, 0.35), (2, 3.0, 2.3, 0.4)):
        a = np.sin(arms * (th + twist * rr) - spd * ph)
        sw += w * np.clip(a, 0, 1) ** 3
    sw *= np.clip(1.15 - rr, 0, 1)
    core = np.exp(-(rr / 0.32) ** 2)
    shell = np.exp(-((rr - 0.97) / 0.05) ** 2)                          # viền vỏ cầu
    fill = 0.18 + 0.12 * (1 - rr)
    inten = np.clip(core * 1.1 + sw * 0.75 + shell * 0.7 + fill * 0.6, 0, 1)
    alpha = np.where(inside, np.clip(0.3 + core + sw * 0.9 + shell, 0, 1), 0)
    # vòng gió mỏng nghiêng quanh vỏ (2 vòng, quay)
    for tilt, spd, rad in ((0.35, 1.0, 0.82), (-0.55, -1.4, 0.88)):
        c, s_ = math.cos(tilt), math.sin(tilt)
        u, v = x * c + y * s_, (-x * s_ + y * c) / 0.32
        rd = np.hypot(u, v)
        ang = np.arctan2(v, u)
        arc = np.clip(np.sin(ang + spd * ph), 0, 1) ** 2               # chỉ một cung sáng chạy vòng
        ring = np.exp(-((rd - rad) / 0.035) ** 2) * arc
        inten = np.maximum(inten, ring * 0.95)
        alpha = np.maximum(alpha, ring * 0.9)
    col = ramp(inten)
    rgba = np.dstack([col, alpha * 255]).reshape(S, SS, S, SS, 4)
    al = rgba[..., 3:4]
    prem = (rgba[..., :3] * al).mean((1, 3))
    am = al.mean((1, 3))
    img = Image.fromarray(np.clip(np.dstack([prem / np.maximum(am, 1e-3), am]), 0, 255).astype(np.uint8), 'RGBA')
    g = np.array(img.filter(ImageFilter.GaussianBlur(5))).astype(float)
    g[..., :3] = (60, 170, 255)
    g[..., 3] *= 0.8
    out = Image.fromarray(g.astype(np.uint8), 'RGBA')
    out.alpha_composite(img)
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    sheet = Image.new('RGBA', (S * N, S), (0, 0, 0, 0))
    for i in range(N):
        sheet.alpha_composite(frame(2 * math.pi * i / N), (S * i, 0))
    sheet.save(os.path.join(ROOT, 'public', 'vfx', 'spirit_orb.png'))
    pv = Image.new('RGBA', (S * 6 * 2 + 20, S * 2 * 2 + 20), (16, 14, 26, 255))
    for i in range(N):
        pv.alpha_composite(sheet.crop((S * i, 0, S * i + S, S)).resize((S * 2, S * 2), Image.LANCZOS), (10 + (i % 6) * S * 2, 10 + (i // 6) * S * 2))
    pv.save(os.path.join(OUT, 'spirit_orb_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
