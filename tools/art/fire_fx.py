"""
LIỆT HỎA PHÙ — vẽ mới (chưa có mẫu):
  1) lá bùa nhỏ: giấy vàng nghệ, viền đỏ son kép, phù văn đỏ (chữ "火" cách điệu + nét bùa), đầu bùa cháy than đỏ rực
     → public/vfx/fire_talisman.png (40×72, trong game thu còn ~0,45)
  2) vụ nổ lửa: quả cầu lửa bung ra (lõi trắng vàng → cam → đỏ), mép lửa xơ theo nhiễu, nguội dần thành khói xám bốc lên
     → public/vfx/fire_blast.png (dải 16 khung 192×192, 30 khung/giây)
  3) vòng sóng lửa sát đất (nhìn chéo): vành cam rực mép xơ → public/vfx/fire_ring.png

  python3 -I tools/art/fire_fx.py
"""
import math
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
VFX = os.path.join(ROOT, 'public', 'vfx')
rng = np.random.default_rng(5)


def vnoise(n, cells, seed):
    """nhiễu giá trị mượt (lặp đều theo cả 2 trục) n×n"""
    r = np.random.default_rng(seed)
    g = r.random((cells, cells))
    x = np.linspace(0, cells, n, endpoint=False)
    i0 = np.floor(x).astype(int)
    f = x - i0
    f = f * f * (3 - 2 * f)
    i1 = (i0 + 1) % cells
    a = g[i0][:, i0] * (1 - f)[None, :] + g[i0][:, i1] * f[None, :]
    b = g[i1][:, i0] * (1 - f)[None, :] + g[i1][:, i1] * f[None, :]
    return a * (1 - f)[:, None] + b * f[:, None]


def fbm(n, seed):
    return sum(vnoise(n, 4 * 2 ** o, seed + o) * 0.5 ** o for o in range(5)) / 1.94


FIRE = [(0.00, (60, 8, 4)), (0.25, (170, 30, 8)), (0.45, (235, 80, 14)), (0.65, (255, 150, 30)),
        (0.82, (255, 215, 90)), (1.00, (255, 252, 230))]


def ramp(t, stops=FIRE):
    t = np.clip(t, 0, 1)
    out = np.zeros(t.shape + (3,))
    for (a, ca), (b, cb) in zip(stops, stops[1:]):
        m = (t >= a) & (t <= b)
        k = ((t - a) / (b - a))[m][:, None]
        out[m] = np.array(ca) * (1 - k) + np.array(cb) * k
    return out


def talisman():
    S = 4
    w, h = 40, 72
    im = Image.new('RGBA', (w * S, h * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pw0, ph0, pw1, ph1 = 5 * S, 6 * S, 35 * S, 70 * S
    d.rectangle((pw0, ph0, pw1, ph1), fill=(242, 206, 110, 255))
    # vân giấy
    px = im.load()
    nz = fbm(256, 3)
    for y in range(ph0, ph1):
        for x in range(pw0, pw1):
            v = nz[(y * 2) % 256, (x * 3) % 256]
            r, g, b, a = px[x, y]
            px[x, y] = (int(r - 28 * v), int(g - 34 * v), int(b - 30 * v), 255)
    red = (190, 24, 20, 255)
    d.rectangle((pw0 + 2 * S, ph0 + 2 * S, pw1 - 2 * S, ph1 - 2 * S), outline=red, width=S)
    d.rectangle((pw0 + 4 * S, ph0 + 4 * S, pw1 - 4 * S, ph1 - 4 * S), outline=red, width=max(1, S // 2))
    cx = (pw0 + pw1) // 2
    # vòng ấn trên đầu
    d.ellipse((cx - 7 * S, ph0 + 8 * S, cx + 7 * S, ph0 + 22 * S), outline=red, width=S)
    # chữ 火 cách điệu trong vòng
    d.line((cx, ph0 + 10 * S, cx, ph0 + 20 * S), fill=red, width=int(1.6 * S))
    d.line((cx, ph0 + 15 * S, cx - 5 * S, ph0 + 20 * S), fill=red, width=int(1.4 * S))
    d.line((cx, ph0 + 15 * S, cx + 5 * S, ph0 + 20 * S), fill=red, width=int(1.4 * S))
    d.line((cx - 4 * S, ph0 + 12 * S, cx - 3 * S, ph0 + 15 * S), fill=red, width=S)
    d.line((cx + 4 * S, ph0 + 12 * S, cx + 3 * S, ph0 + 15 * S), fill=red, width=S)
    # nét bùa chạy dọc thân
    y = ph0 + 25 * S
    pts = []
    for i in range(14):
        pts.append((cx + (5 if i % 2 else -5) * S * (0.6 + 0.4 * math.sin(i)), y + i * 2.6 * S))
    d.line(pts, fill=red, width=int(1.3 * S), joint='curve')
    for yy in (ph0 + 33 * S, ph0 + 45 * S):
        d.line((cx - 7 * S, yy, cx + 7 * S, yy), fill=red, width=S)
    d.ellipse((cx - 2 * S, ph1 - 12 * S, cx + 2 * S, ph1 - 8 * S), fill=red)
    im = im.resize((w, h), Image.LANCZOS)
    # đầu bùa cháy: mép trên cháy xém + than đỏ rực
    a = np.array(im).astype(float)
    yy, xx = np.mgrid[0:h, 0:w]
    edge = 6 + 2.5 * np.sin(xx * 1.3) + 1.5 * np.sin(xx * 2.9 + 1)
    burnt = yy < edge
    a[burnt, 3] = 0
    glow = (yy >= edge) & (yy < edge + 3)
    a[glow, :3] = a[glow, :3] * 0.3 + np.array([255, 120, 30]) * 0.7
    char = (yy >= edge + 3) & (yy < edge + 6)
    a[char, :3] *= 0.55
    out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')
    g = out.filter(ImageFilter.GaussianBlur(2))
    gg = np.array(g).astype(float)
    gg[..., :3] = (255, 140, 40)
    gg[..., 3] *= 0.5
    res = Image.fromarray(gg.astype(np.uint8), 'RGBA')
    res.alpha_composite(out)
    return res


def blast(n=16, size=192):
    """quả cầu lửa cuộn: mật độ = nhiễu fbm (đã chuẩn hoá) cuộn lên theo thời gian, nhiều múi lửa không đều;
    nhiệt độ thay đổi theo nhiễu (vệt vàng trắng lẫn cam đỏ), mép cháy đỏ sẫm → khói xám bốc lên ở cuối"""
    yy, xx = np.mgrid[0:size, 0:size].astype(float)
    dx, dy = (xx - size / 2) / (size / 2), (yy - size / 2) / (size / 2)
    def norm(a):
        return (a - a.min()) / (a.max() - a.min())
    big = [norm(fbm(size * 2, 40 + i)) for i in range(3)]
    def samp(arr, ox, oy, sc=1.0):
        ix = ((xx * sc + ox) % (size * 2)).astype(int)
        iy = ((yy * sc + oy) % (size * 2)).astype(int)
        return arr[iy, ix]
    frames = []
    for f in range(n):
        u = f / (n - 1)
        R = 0.22 + 0.68 * (1 - (1 - min(1, u * 1.7)) ** 2.6)
        rise = 0.22 * u ** 1.5
        r = np.hypot(dx, dy + rise)
        # cuộn: nhiễu trôi lên trên + nở ra theo thời gian
        N1 = samp(big[0], 30, 60 + u * 90, 1.0 - 0.3 * u)
        N2 = samp(big[1], 80, 20 + u * 140, 1.6)
        N3 = samp(big[2], 10, u * 60, 2.4)
        edge = R * (0.62 + 0.62 * N1)
        dens = np.clip((edge - r) / (0.45 * R + 1e-3), 0, 1) ** 0.7
        dens *= 0.55 + 0.6 * N2
        heat = np.clip(1.1 - u * 1.15, 0, 1)
        temp = np.clip((dens * 0.9 + (N3 - 0.45) * 0.9) * (0.45 + 0.7 * heat) + np.clip(1 - r / max(R, 1e-3), 0, 1) * heat * 0.45, 0, 1)
        temp = temp * (0.8 + 0.2 * heat)
        col = ramp(temp)
        smoke = np.clip((0.85 - temp) * 2.0, 0, 1) * np.clip((u - 0.2) * 2.5, 0, 1)
        grey = np.array([58, 50, 48]) * (0.7 + 0.6 * N3[..., None])
        col = col * (1 - smoke[..., None]) + grey * smoke[..., None]
        alpha = np.clip(dens * 1.5, 0, 1) * np.clip(1.3 - u ** 1.5, 0, 1)
        frames.append(np.dstack([np.clip(col, 0, 255), alpha * 255]).astype(np.uint8))
    sheet = Image.new('RGBA', (size * n, size), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        sheet.paste(Image.fromarray(fr, 'RGBA'), (size * i, 0))
    return sheet


def ring(w=256, k=0.6):
    h = int(w * k)
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    u = (xx + 0.5) / w * 2 - 1
    v = ((yy + 0.5) / h * 2 - 1)
    r = np.hypot(u, v) * 1.06
    th = np.arctan2(v, u)
    jag = 0.018 * np.sin(th * 13) + 0.012 * np.sin(th * 29 + 1)
    band = np.exp(-((r - 0.9 - jag) / 0.06) ** 2)
    inner = np.exp(-((r - 0.75) / 0.18) ** 2) * 0.35
    a = np.clip(band + inner, 0, 1) * (r < 1.05)
    col = ramp(0.35 + 0.6 * band)
    return Image.fromarray(np.dstack([col, a * 255]).astype(np.uint8), 'RGBA')


def main():
    os.makedirs(OUT, exist_ok=True)
    t = talisman()
    t.save(os.path.join(VFX, 'fire_talisman.png'))
    b = blast()
    b.save(os.path.join(VFX, 'fire_blast.png'))
    rg = ring()
    rg.save(os.path.join(VFX, 'fire_ring.png'))
    pv = Image.new('RGBA', (192 * 8 + 20, 192 * 2 + 140), (20, 18, 26, 255))
    for i in range(16):
        pv.alpha_composite(b.crop((192 * i, 0, 192 * i + 192, 192)), (10 + (i % 8) * 192, 10 + (i // 8) * 192))
    pv.alpha_composite(t.resize((t.width * 3, t.height * 3), Image.NEAREST), (10, 192 * 2 + 15))
    pv.alpha_composite(t, (150, 192 * 2 + 40))
    pv.alpha_composite(rg.resize((200, 120)), (260, 192 * 2 + 15))
    pv.save(os.path.join(OUT, 'fire_fx_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
