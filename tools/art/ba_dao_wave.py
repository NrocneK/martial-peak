"""
BÁ ĐAO (thức tỉnh) — đao khí bay, VẼ MỚI bằng công thức (không lấy từ ảnh mẫu nữa để khỏi nghiêng lệch).

Hình lưỡi liềm dựng trên MẶT ĐẤT, đối xứng tuyệt đối quanh hướng bay (+x):
  - mép trước = cung tròn bán kính R_OUT quanh chỗ nhân vật (gốc toạ độ)
  - mép sau   = cung tròn bán kính R_IN, tâm lùi về sau D → lưỡi dày ở giữa, nhọn dần ở hai mũi
  - mép trước: viền hồng trắng rực + quầng tím; thân: dải tím chuyển dần, các sọc gió chạy ngược về sau;
    mép sau: lượn sóng mềm như đuôi khí; hai mũi mờ dần
  - một vệt chém mảnh (cung nhỏ) chạy sau lưỡi chính — như vệt kiếm trong ảnh mẫu
Mỗi hướng: điểm đích → trải về mặt đất (chia K) → xoay ngược theo hướng bay → tính trực tiếp công thức (không lấy mẫu
lại ảnh nên không vỡ / lệch) → khử răng cưa 3×3. Tâm ảnh = chỗ nhân vật.

  python3 -I tools/art/ba_dao_wave.py → public/vfx/ba_dao_wave_<hướng>.png (e, se, s, sw, w, nw, n, ne)
                                        + tools/art/out/ba_dao_wave_preview.png
"""
import math
import os
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
K = 0.7                       # phối cảnh mặt đất (trục dọc co còn 70%, như vòng đao khí)
HALF = 380.0                  # nửa bề ngang khung (đơn vị mặt đất)
SIZE = 384                    # bề ngang ảnh ra (px)
SS = 3                        # khử răng cưa
R_OUT, R_IN, D = 300.0, 292.0, 105.0
DIRS = {'e': 0, 'se': 45, 's': 90, 'sw': 135, 'w': 180, 'nw': 225, 'n': 270, 'ne': 315}

STOPS = [(0.00, (40, 10, 70)), (0.25, (92, 26, 160)), (0.50, (160, 46, 224)), (0.70, (226, 92, 246)),
         (0.86, (255, 170, 252)), (1.00, (255, 248, 255))]


def ramp(t):
    t = np.clip(t, 0, 1)
    out = np.zeros(t.shape + (3,))
    for (a, ca), (b, cb) in zip(STOPS, STOPS[1:]):
        m = (t >= a) & (t <= b)
        k = ((t - a) / (b - a))[m][:, None]
        out[m] = np.array(ca) * (1 - k) + np.array(cb) * k
    return out


def crescent(gx, gy):
    """màu + độ đục của lưỡi liềm tại toạ độ mặt đất (gx, gy), hướng bay = +x"""
    r = np.hypot(gx, gy)
    phi = np.arctan2(gy, gx)
    r_in = np.hypot(gx + D, gy)
    wav = 7 * np.sin(phi * 17) ** 2 + 4 * np.sin(phi * 41 + 1.3)                # mép sau lượn sóng (đuôi khí)
    inner = R_IN + wav
    depth = np.clip((R_OUT - r) / np.maximum(R_OUT - (inner - D * np.cos(phi)), 1), 0, 1.5)   # 0 = mép trước … 1 = mép sau
    body = (r <= R_OUT) & (r_in >= inner)
    span = np.clip(1 - (np.abs(phi) / math.radians(70)) ** 4, 0, 1)            # hai mũi mờ dần
    streak = 0.88 + 0.12 * np.sin(phi * 64 + depth * 2.5) * np.sin(phi * 23 - 0.7)
    inten = np.where(depth < 0.07, 1.0, (0.88 - 0.55 * depth) * streak)
    a_body = body * span * np.clip(1.15 - depth ** 1.6, 0, 1)
    glow = np.clip(1 - (r - R_OUT) / 26, 0, 1) * (r > R_OUT) * span * 0.55     # quầng tím ngoài mép trước
    r2 = np.hypot(gx + 150, gy)                                                 # vệt chém mảnh sau lưỡi chính
    thin = np.clip(1 - np.abs(r2 - 270) / 4, 0, 1) * np.clip(1 - (np.abs(phi) / math.radians(48)) ** 2, 0, 1) * (gx > 0)
    tot = a_body + glow + thin
    col = (ramp(inten) * a_body[..., None] + np.array([196, 70, 240]) * glow[..., None]
           + np.array([255, 220, 255]) * thin[..., None]) / np.maximum(tot, 1e-3)[..., None]
    return col, np.clip(tot, 0, 1)


def render(deg):
    w, h = SIZE * SS, int(SIZE * K) * SS
    Y, X = np.mgrid[0:h, 0:w].astype(float)
    gx0 = (X + 0.5) / w * 2 * HALF - HALF
    gy0 = ((Y + 0.5) / h * 2 * HALF * K - HALF * K) / K                       # trải trục dọc về mặt đất
    sa = math.radians(deg)
    ga = math.atan2(math.sin(sa) / K, math.cos(sa))                             # hướng bay trên màn hình → mặt đất
    c, s = math.cos(-ga), math.sin(-ga)
    gx, gy = gx0 * c - gy0 * s, gx0 * s + gy0 * c                               # xoay về hệ lưỡi liềm (bay = +x)
    col, a = crescent(gx, gy)
    rgba = np.dstack([col, a[..., None] * 255]).reshape(h // SS, SS, w // SS, SS, 4)
    al = rgba[..., 3:4]
    prem = (rgba[..., :3] * al).mean((1, 3))
    am = al.mean((1, 3))
    out = np.dstack([prem / np.maximum(am, 1e-3), am])
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA')


def main():
    os.makedirs(OUT, exist_ok=True)
    outs = {}
    for name, deg in DIRS.items():
        im = render(deg)
        im.save(os.path.join(ROOT, 'public', 'vfx', f'ba_dao_wave_{name}.png'))
        outs[name] = im
    cw, ch = outs['e'].size
    pv = Image.new('RGBA', (cw * 3, ch * 3), (26, 24, 40, 255))
    pos = {'nw': (0, 0), 'n': (1, 0), 'ne': (2, 0), 'w': (0, 1), 'e': (2, 1), 'sw': (0, 2), 's': (1, 2), 'se': (2, 2)}
    dr = ImageDraw.Draw(pv)
    for name, (i, j) in pos.items():
        pv.alpha_composite(outs[name], (i * cw, j * ch))
        dr.ellipse((i * cw + cw / 2 - 3, j * ch + ch / 2 - 3, i * cw + cw / 2 + 3, j * ch + ch / 2 + 3), fill=(255, 210, 90, 255))
    pv.save(os.path.join(OUT, 'ba_dao_wave_preview.png'))
    print('ok', outs['e'].size)


if __name__ == '__main__':
    main()
