"""
BÁ ĐAO (thức tỉnh) — đao khí bay: lấy vết chém trong ảnh mẫu tools/art/ref/ba_dao_wave_ref.png (vệt chém lưỡi liềm xanh
trên nền sàn), tách khỏi nền + nhân vật, ĐỔI MÀU sang tông tím hồng của vòng đao khí Bá Đao.

1) Tách: hiệu ứng là màu xanh tự phát sáng → độ đục = (độ sáng kênh xanh lam vượt nền) × (độ "xanh" so với đỏ);
   bỏ vùng nhân vật (tóc vàng, áo, thanh kiếm dựng đứng) — trừ lõi trắng của vệt chém mảnh chạy ngang qua người.
2) Đổi màu: lấy độ sáng làm chỉ số, ánh xạ qua dải tím đen → tím → hồng tím → trắng hồng (cùng bảng với vòng Bá Đao).
3) 8 HƯỚNG đúng phối cảnh: lưỡi liềm nằm PHẲNG trên mặt đất (nhìn chéo, trục dọc co còn K = 0,7) nên không xoay
   ảnh trên mặt phẳng màn hình. Mỗi hướng: duỗi trục dọc về mặt đất (chia K) → xoay trên mặt đất cho phía lồi của
   lưỡi liềm hướng đúng đường bay → co lại (nhân K). Tâm xoay = chỗ nhân vật đứng trong ảnh mẫu, đặt ở GIỮA ảnh ra,
   nên trong game chỉ cần đặt ảnh tại vị trí nhân vật rồi cho bay thẳng theo hướng đó — không xoay gì thêm.
   → public/vfx/ba_dao_wave_<hướng>.png (e, se, s, sw, w, nw, n, ne)

  python3 -I tools/art/ba_dao_wave.py → public/vfx/ba_dao_wave_*.png + tools/art/out/ba_dao_wave_preview.png
"""
import math
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
SIZE = 384
K = 0.7                         # mặt đất nhìn chéo: trục dọc co còn 70% (như vòng đao khí)
PIVOT = (300.0, 285.0)          # chỗ nhân vật đứng trong ảnh mẫu = tâm xoay
R_OUT = 380                     # bán kính khung ra (đơn vị điểm ảnh mẫu, trên mặt đất)
DIRS = {'e': 0, 'se': 45, 's': 90, 'sw': 135, 'w': 180, 'nw': 225, 'n': 270, 'ne': 315}
sys.path.insert(0, HERE)
from ba_dao_hd import sample  # noqa: E402

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
    alpha = np.clip((alpha - 0.22) / 0.78, 0, 1)
    # vân gạch sàn còn lẫn trong quầng sáng mờ → ở vùng mờ dùng độ đục đã làm nhòe (mất đường gạch), vùng đặc giữ nguyên
    blur = np.array(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))) / 255.0
    alpha = np.where(alpha > 0.6, alpha, np.minimum(alpha, blur) * 0.85)
    lum = np.clip((G - 70) / 190, 0, 1) ** 1.35             # kênh lục tách lõi sáng (xanh trắng) với thân (xanh lam); thân giữ tím
    col = ramp(lum ** 0.9)
    rgba = np.dstack([col, alpha * 255]).astype(np.uint8)
    # hướng "phía trước" của lưỡi liềm trên mặt đất = trọng tâm độ đục so với chỗ nhân vật
    hh, ww = alpha.shape
    yy, xx = np.mgrid[0:hh, 0:ww].astype(float)
    wgt = alpha * (alpha > 0.3)
    gx = ((xx - PIVOT[0]) * wgt).sum() / wgt.sum()
    gy = ((yy - PIVOT[1]) / K * wgt).sum() / wgt.sum()
    fwd = math.atan2(gy, gx)
    print('huong phia truoc tren mat dat:', round(math.degrees(fwd), 1))
    n = 2 * R_OUT
    Y, X = np.mgrid[0:int(n * K), 0:n].astype(float)
    X -= R_OUT
    Y -= n * K / 2
    outs = {}
    for name, deg in DIRS.items():
        sa = math.radians(deg)
        ga = math.atan2(math.sin(sa) / K, math.cos(sa))            # hướng bay trên màn hình → trên mặt đất
        rot = ga - fwd
        gxd, gyd = X, Y / K                                          # điểm đích → mặt đất
        c, s_ = math.cos(-rot), math.sin(-rot)
        sxg, syg = gxd * c - gyd * s_, gxd * s_ + gyd * c            # xoay ngược về mặt đất của ảnh mẫu
        out = sample(rgba, PIVOT[0] + sxg, PIVOT[1] + syg * K)
        im = Image.fromarray(out, 'RGBA')
        k = SIZE / im.width
        im = im.resize((SIZE, round(im.height * k)), Image.LANCZOS)
        im.save(os.path.join(ROOT, 'public', 'vfx', f'ba_dao_wave_{name}.png'))
        outs[name] = im
    old = os.path.join(ROOT, 'public', 'vfx', 'ba_dao_wave.png')
    if os.path.exists(old):
        os.remove(old)
    # xem thử: lưới 3×3 theo hướng, chấm trắng = chỗ nhân vật
    cw, ch = outs['e'].size
    pv = Image.new('RGBA', (cw * 3, ch * 3), (26, 24, 40, 255))
    pos = {'nw': (0, 0), 'n': (1, 0), 'ne': (2, 0), 'w': (0, 1), 'e': (2, 1), 'sw': (0, 2), 's': (1, 2), 'se': (2, 2)}
    for name, (i, j) in pos.items():
        pv.alpha_composite(outs[name], (i * cw, j * ch))
        ImageDraw.Draw(pv).ellipse((i * cw + cw / 2 - 3, j * ch + ch / 2 - 3, i * cw + cw / 2 + 3, j * ch + ch / 2 + 3), fill=(255, 255, 255, 255))
    pv.save(os.path.join(OUT, 'ba_dao_wave_preview.png'))
    img = outs['e']
    print('ok', img.size)


if __name__ == '__main__':
    main()
