"""
VẠN KIẾM QUY TÔNG — kiếm khí CÙNG DÁNG với kiếm khí Ngự Kiếm Thuật (tools/art/qi_sword_light.py: lưỡi thẳng thuôn,
khâu cụp 2 đầu tròn, chuôi phình, núm tròn), nhưng tách thành 3 lớp để mỗi thanh có viền 1 trong 9 màu:
  · qi_blade_core.png : lõi TRONG SUỐT, sáng — giữa thân gần như trong, sáng dần ra sát mép (cộng sáng, trắng)
  · qi_blade_rim.png  : viền (trắng, game tô màu; vẽ thường nên viền đen vẫn thấy)
  · qi_blade_glow.png : quầng mềm quanh viền (game tô cùng màu, cộng sáng; viền đen thì không vẽ quầng)
Mũi hướng PHẢI như ảnh kiếm Ngự Kiếm; khung 344×72 (cùng tỉ lệ qi_sword_light.png); mũi ở (TIPX, 0.5).
  python3 -I tools/art/qi_blade.py
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VFX = os.path.join(ROOT, 'public', 'vfx')
OUT = os.path.join(HERE, 'out')
X0, X1, CY, HALF = 150, 1010, 160.0, 90          # vùng cắt trên khung vẽ gốc 1024×320 của qi_sword_light.py
OW, OH = 344, 72
SS = 2
YY, XX = np.mgrid[0:int(2 * HALF) * SS, 0:(X1 - X0) * SS].astype(np.float32)
X, Y = (XX + 0.5) / SS + X0, (YY + 0.5) / SS + CY - HALF


# ---- hình kiếm: chép nguyên từ qi_sword_light.py
def poly(pts):
    p = np.asarray(pts, np.float32).reshape(-1, 2)
    d = np.full(X.shape, 1e9, np.float32)
    inside = np.zeros(X.shape, bool)
    for i in range(len(p)):
        a, b = p[i], p[i - 1]
        e = b - a
        wx, wy = X - a[0], Y - a[1]
        t = np.clip((wx * e[0] + wy * e[1]) / (e @ e + 1e-9), 0, 1)
        d = np.minimum(d, np.hypot(wx - e[0] * t, wy - e[1] * t))
        inside ^= ((Y >= a[1]) != (Y >= b[1])) & (X < (b[0] - a[0]) * (Y - a[1]) / (b[1] - a[1] + 1e-9) + a[0])
    return np.where(inside, -d, d)


def seg(x0, y0, x1, y1, r0, r1=None):
    r1 = r0 if r1 is None else r1
    dx, dy = x1 - x0, y1 - y0
    L2 = dx * dx + dy * dy or 1
    t = np.clip(((X - x0) * dx + (Y - y0) * dy) / L2, 0, 1)
    return np.hypot(X - (x0 + dx * t), Y - (y0 + dy * t)) - (r0 + (r1 - r0) * t)


def bez(pts, n=40):
    P = np.asarray(pts, np.float32)
    out = []
    for i in range(n + 1):
        t = i / n
        Q = P.copy()
        while len(Q) > 1:
            Q = Q[:-1] * (1 - t) + Q[1:] * t
        out.append(Q[0])
    return out


def stroke(pts, r0, r1):
    d = np.full(X.shape, 1e9, np.float32)
    n = len(pts) - 1
    for i in range(n):
        d = np.minimum(d, seg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r0 + (r1 - r0) * i / n, r0 + (r1 - r0) * (i + 1) / n))
    return d


GX, TIP, TB = 300, 990, 860
hw0, hw1 = 18, 15
xs = np.linspace(GX + 6, TIP, 60)
up, dn = [], []
for x in xs:
    w = hw0 + (hw1 - hw0) * (x - GX) / (TB - GX) if x < TB else hw1 * (1 - (x - TB) / (TIP - TB)) ** 0.85
    up.append((x, CY - w)); dn.append((x, CY + w))
blade = poly([v for p in up + dn[::-1] for v in p])
guard = np.minimum.reduce([
    stroke(bez([(GX + 6, CY - 34), (GX - 4, CY - 18), (GX - 6, CY), (GX - 4, CY + 18), (GX + 6, CY + 34)]), 6.5, 6.5),
    np.hypot(X - (GX + 9), Y - (CY - 36)) - 8.5,
    np.hypot(X - (GX + 9), Y - (CY + 36)) - 8.5,
    np.hypot(X - (GX - 2), Y - CY) - 10,
])
grip = stroke(bez([(GX - 10, CY), (GX - 50, CY), (GX - 90, CY)]), 8, 7)
grip = np.minimum(grip, np.hypot((X - (GX - 50)) / 2.6, Y - CY) - 9.5)
pommel = np.hypot((X - (GX - 104)) / 1.2, Y - CY) - 12
d = np.minimum.reduce([blade, guard, grip, pommel])


def main():
    os.makedirs(OUT, exist_ok=True)
    inside = np.clip(0.5 - d / 1.0, 0, 1)
    depth = np.clip(-d / 14, 0, 1)
    core = inside * (0.12 + 0.75 * (1 - depth) ** 2.2)                   # trong suốt ở giữa, sáng dần ra mép
    core = np.maximum(core, np.exp(-((Y - CY) / 1.4) ** 2) * (X > GX + 12) * (X < TIP - 40) * 0.55 * inside)   # sống kiếm
    rim = np.exp(-((d + 2.6) / 2.4) ** 2)                                  # viền màu ngay mép
    glow = ndimage.gaussian_filter(np.clip(inside + rim, 0, 1), 7 * SS) * 1.3 * (1 - inside)   # chỉ toả ra ngoài, lõi vẫn trong

    def save(a, name):
        im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).resize((OW, OH), Image.LANCZOS)
        img = Image.merge('RGBA', [Image.new('L', (OW, OH), 255)] * 3 + [im])
        img.save(os.path.join(VFX, name))
        return np.array(im).astype(float)[..., None] / 255
    ca, ra, ga = save(core, 'qi_blade_core.png'), save(rim, 'qi_blade_rim.png'), save(glow * 0.6, 'qi_blade_glow.png')
    print('tip', round((TIP - X0) / (X1 - X0), 4))
    cols = [(255, 50, 50), (255, 150, 30), (255, 235, 40), (60, 230, 80), (60, 140, 255), (70, 60, 230), (170, 70, 255), (0, 0, 0), (255, 255, 255)]
    pv = Image.new('RGB', (OW * 2, OH * 9), (26, 24, 40))
    for i, col in enumerate(cols):
        col = np.array(col, float)
        base = np.full((OH, OW, 3), (26, 24, 40.))
        if col.sum() > 0:
            base = base + col * ga
        base = np.clip(base + 255 * ca, 0, 255)
        base = base * (1 - ra) + col * ra
        pv.paste(Image.fromarray(base.astype(np.uint8)).resize((OW * 2, OH * 2), Image.LANCZOS).crop((0, OH // 2, OW * 2, OH // 2 + OH)), (0, i * OH))
    pv.save(os.path.join(OUT, 'qi_blade_preview.png'))


if __name__ == '__main__':
    main()
