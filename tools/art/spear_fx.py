"""
PHÁ TRẬN THƯƠNG — hiệu ứng đòn đâm, dựng lại theo đòn đâm ĐẦU TIÊN trong video mẫu
(tools/art/ref/spear_thrust1/: giây 1,3–2,1 của SPEAR-EFFECT.mp4). Video gồm 4 nhịp:
  1) tụ lực ~0,2s: mũi thương sáng viền xanh ngọc, 2 vệt gió cong từ phía sau hút dồn về mũi   → spear_wind.png
  2) bung: khối sáng hình thoi lóe ra ở mũi thương                                            → spear_flash.png
  3) đâm: khối thoi kéo vụt thành mũi giáo năng lượng dài, nhọn, đuôi loãng; vòng sóng mỏng ở gốc → spear_lance.png, spear_ring.png
  4) tan: mũi giáo thuôn mảnh rồi tắt, đốm sáng văng ở mũi (dùng tia lửa sẵn có)
Màu giữ như video: lõi trắng xanh → xanh ngọc → xanh lục đậm. Mọi hình hướng về +x (phải), trong game xoay theo hướng đâm.

  python3 -I tools/art/spear_fx.py → public/vfx/spear_*.png + tools/art/out/spear_fx_preview.png
"""
import os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
SS = 3

STOPS = [(0.00, (10, 90, 70)), (0.35, (20, 170, 130)), (0.65, (60, 240, 200)), (0.85, (170, 255, 235)), (1.00, (245, 255, 252))]
GLOW = np.array([40, 220, 170], float)


def ramp(t):
    t = np.clip(t, 0, 1)
    out = np.zeros(t.shape + (3,))
    for (a, ca), (b, cb) in zip(STOPS, STOPS[1:]):
        m = (t >= a) & (t <= b)
        k = ((t - a) / (b - a))[m][:, None]
        out[m] = np.array(ca) * (1 - k) + np.array(cb) * k
    return out


def finish(col, a, w, h):
    rgba = np.dstack([col, a[..., None] * 255]).reshape(h, SS, w, SS, 4)
    al = rgba[..., 3:4]
    prem = (rgba[..., :3] * al).mean((1, 3))
    am = al.mean((1, 3))
    return Image.fromarray(np.clip(np.dstack([prem / np.maximum(am, 1e-3), am]), 0, 255).astype(np.uint8), 'RGBA')


def grid(w, h):
    Y, X = np.mgrid[0:h * SS, 0:w * SS].astype(float)
    return (X + 0.5) / (w * SS), (Y + 0.5) / (h * SS) - 0.5           # x: 0..1 (đuôi → mũi), y: -0.5..0.5


def diamond(w, h, widest, wmax, tail_pow, tail_fade, glow_px):
    """hình thoi nhọn hai đầu: rộng nhất ở `widest`, nửa bề rộng tối đa `wmax` (tỉ lệ chiều cao)"""
    x, y = grid(w, h)
    half = np.where(x < widest, wmax * (x / widest) ** tail_pow, wmax * ((1 - x) / (1 - widest)) ** 1.05)
    half = np.maximum(half, 1e-4)
    d = np.abs(y) / half                                               # 0 = giữa, 1 = mép
    inside = d <= 1
    core = np.clip(1 - d, 0, 1)
    fade = np.clip(x / tail_fade, 0, 1) ** 0.8                         # đuôi loãng dần
    inten = (0.35 + 0.65 * core ** 0.7) * (0.55 + 0.45 * np.clip((x - 0.2) / 0.6, 0, 1))
    a_in = inside * fade * np.clip(core * 2.2, 0, 1) ** 0.6           # mép mềm, không viền cứng
    col = ramp(inten)
    sharp = finish(col, np.clip(a_in, 0, 1), w, h)
    # quầng sáng = chính hình đó làm nhòe (cùng màu mép, không tạo viền tối)
    g = sharp.filter(ImageFilter.GaussianBlur(glow_px))
    ga = np.array(g).astype(float)
    ga[..., 3] *= 0.75
    out = Image.fromarray(ga.astype(np.uint8), 'RGBA')
    out.alpha_composite(sharp)
    return out


def wind(w=72, h=26):
    """vệt gió cong mảnh: cung tròn nhọn hai đầu"""
    x, y = grid(w, h)
    yc = 0.30 - 0.9 * (x - 0.5) ** 2                                    # cung cong lên
    thick = 0.16 * np.sin(np.pi * np.clip(x, 0, 1)) ** 1.2
    d = np.abs(y - yc) / np.maximum(thick, 1e-4)
    a = np.clip(1 - d, 0, 1) ** 0.8 * (thick > 0.01)
    col = ramp(0.45 + 0.4 * a)
    return finish(col, a, w, h)


def ring(n=96):
    x, y = grid(n, n)
    r = np.hypot(x - 0.5, y) * 2
    a = np.exp(-((r - 0.82) / 0.06) ** 2) + 0.35 * np.exp(-((r - 0.82) / 0.16) ** 2)
    col = ramp(0.5 + 0.5 * np.exp(-((r - 0.82) / 0.05) ** 2))
    return finish(col, np.clip(a, 0, 1), n, n)


def main():
    os.makedirs(OUT, exist_ok=True)
    imgs = {
        'lance': diamond(320, 48, 0.70, 0.30, 0.6, 0.6, 4.0),   # mũi giáo năng lượng dài
        'flash': diamond(120, 64, 0.45, 0.46, 0.8, 0.15, 6.0),    # khối thoi lóe ở mũi
        'wind': wind(),
        'ring': ring(),
    }
    for k, im in imgs.items():
        im.save(os.path.join(ROOT, 'public', 'vfx', f'spear_{k}.png'))
    pv = Image.new('RGBA', (360, 260), (12, 20, 22, 255))
    pv.alpha_composite(imgs['lance'], (20, 20))
    pv.alpha_composite(imgs['flash'], (20, 100))
    pv.alpha_composite(imgs['wind'], (170, 120))
    pv.alpha_composite(imgs['ring'], (250, 100))
    pv = pv.resize((720, 520), Image.LANCZOS)
    pv.save(os.path.join(OUT, 'spear_fx_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
