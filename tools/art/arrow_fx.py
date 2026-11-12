"""
TRUY TINH TIỄN — đầu mũi tên năng lượng (thay mũi tên vật lý), dựng theo ảnh mẫu tools/art/ref/truy_tien_ref.jpg,
ĐỔI sang tông ĐỎ (mẫu tím). Mẫu: mũi nhọn dài lõi trắng sáng, sau mũi là khối sáng rực có vài mảnh tinh thể góc cạnh
xòe ra hai bên, rồi tới đuôi tối kéo dài với các sợi khí xoắn. Ở đây chỉ vẽ ĐẦU (mũi + khối sáng + mảnh tinh thể);
ĐUÔI vẽ trực tiếp trong game theo đường bay thật (để uốn cong theo đường bay) — xem arrowBolt() trong skillFx.ts.
Hướng bay = +x; điểm mũi ở mép phải, tâm khối sáng ở x ≈ 62%.

  python3 -I tools/art/arrow_fx.py → public/vfx/arrow_head.png + tools/art/out/arrow_fx_preview.png
"""
import os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
SS = 3
STOPS = [(0.00, (60, 6, 16)), (0.30, (150, 16, 36)), (0.55, (232, 40, 60)), (0.75, (255, 110, 120)),
         (0.90, (255, 200, 200)), (1.00, (255, 250, 248))]


def ramp(t):
    t = np.clip(t, 0, 1)
    out = np.zeros(t.shape + (3,))
    for (a, ca), (b, cb) in zip(STOPS, STOPS[1:]):
        m = (t >= a) & (t <= b)
        k = ((t - a) / (b - a))[m][:, None]
        out[m] = np.array(ca) * (1 - k) + np.array(cb) * k
    return out


def head(w=150, h=56):
    Y, X = np.mgrid[0:h * SS, 0:w * SS].astype(float)
    x = (X + 0.5) / (w * SS)                    # 0..1
    y = (Y + 0.5) / (h * SS) - 0.5              # -0.5..0.5
    # mũi nhọn dài (x 0.45 → 1), rộng nhất ở 0.55
    tip_half = np.where(x > 0.55, 0.085 * ((1 - x) / 0.45) ** 1.3, 0.085 * np.clip((x - 0.36) / 0.19, 0, 1) ** 0.7)
    spike = np.clip(1 - np.abs(y) / np.maximum(tip_half, 1e-4), 0, 1) * (tip_half > 1e-3)
    # khối sáng rực quanh gốc mũi
    blob = np.exp(-(((x - 0.57) / 0.12) ** 2 + (y / 0.15) ** 2))
    # mảnh tinh thể góc cạnh xòe hai bên (tam giác nhọn hướng về sau)
    shards = np.zeros_like(x)
    for sx, sy, ln, wd, side in ((0.52, 0.10, 0.20, 0.07, 1), (0.50, -0.11, 0.22, 0.07, -1), (0.42, 0.16, 0.14, 0.05, 1),
                                 (0.40, -0.17, 0.15, 0.05, -1), (0.62, 0.14, 0.10, 0.04, 1), (0.62, -0.15, 0.10, 0.04, -1)):
        u = (sx - x) / ln                        # 0 ở gốc mảnh → 1 ở đuôi mảnh (về phía sau)
        v = (y - sy - side * 0.25 * u * ln) / wd
        uu = np.clip(u, 0, 1)
        shards = np.maximum(shards, np.clip(1 - np.abs(v) / np.maximum(1 - uu, 1e-3), 0, 1) * ((u > 0) & (u < 1)) * (1 - uu) ** 0.4)
    core = spike ** 2                                     # lõi trắng chỉ ở đường giữa mũi
    t = np.clip(0.30 + 0.45 * blob + 0.25 * shards + 0.6 * core, 0, 1)
    alpha = np.clip(spike * 1.2 + blob * 0.9 + shards * 0.8, 0, 1)
    col = ramp(t)
    rgba = np.dstack([col, alpha[..., None] * 255]).reshape(h, SS, w, SS, 4)
    al = rgba[..., 3:4]
    prem = (rgba[..., :3] * al).mean((1, 3))
    am = al.mean((1, 3))
    img = Image.fromarray(np.clip(np.dstack([prem / np.maximum(am, 1e-3), am]), 0, 255).astype(np.uint8), 'RGBA')
    g = img.filter(ImageFilter.GaussianBlur(5))
    ga = np.array(g).astype(float)
    ga[..., :3] = np.array([255, 60, 80])
    ga[..., 3] *= 0.85
    out = Image.fromarray(ga.astype(np.uint8), 'RGBA')
    out.alpha_composite(img)
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    im = head()
    im.save(os.path.join(ROOT, 'public', 'vfx', 'arrow_head.png'))
    pv = Image.new('RGBA', (im.width * 3 + 20, im.height * 3 + 20), (60, 60, 64, 255))
    pv.alpha_composite(im.resize((im.width * 3, im.height * 3), Image.LANCZOS), (10, 10))
    pv.save(os.path.join(OUT, 'arrow_fx_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
