"""
Thanh kiếm CHÂN KHÍ NGƯNG TỤ (Ngự Kiếm Thuật) — không phải kiếm thật, mà là khí ngưng thành hình kiếm.

  python3 -I tools/art/qi_sword.py   → tools/art/out/qi_sword_<kiểu>.png (RGBA, mũi hướng sang phải, 1024x256)
                                       + tools/art/out/qi_sword_preview.png (3 kiểu dáng, cỡ lớn + cỡ trong trận)
  Kiểu: long_hon (khâu đầu rồng, lưỡi phun từ miệng rồng, dải khí xoắn quanh thân, râu rồng bay)
        · phu_van (thân pha lê nhiều mặt cắt, phù văn sáng dọc sống kiếm, khâu đĩa bát quái, mảnh tinh thể lơ lửng)
        · phuong_vu (khâu cánh phượng xòe lông vũ, mép lưỡi liếm lửa, đuôi phượng)

Dựng bằng hình học khoảng cách (SDF):
  • thân kiếm trong suốt: viền lưỡi sáng gắt, lòng kiếm mờ có luồng khí chảy dọc thân (nhiễu kéo dài theo trục kiếm)
  • sống kiếm: lõi trắng nóng chạy suốt thân
  • khâu kiếm = hai cánh khí cong vút ra sau; chuôi + núm = khí mờ hơn; đuôi = các sợi khí tan dần
  • quầng sáng 2 lớp + hạt khí lấp lánh dọc lưỡi, chớp sáng ở mũi kiếm
Ảnh xuất ra dùng hòa trộn CỘNG (ADD) trong game: nền đen = trong suốt.
"""
import math
import os
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
W, H = 1024, 320
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
X, Y = XX + 0.5, YY + 0.5
CY = 160.0

PALETTES = {
    'tu_linh': ['#14062e', '#4a1aa0', '#8a5aff', '#d8c0ff', '#ffffff'],
    'kim_hoa': ['#3a0a02', '#c8320a', '#ff9a2a', '#ffe8a0', '#ffffff'],
    'thanh_lam': ['#061a52', '#1a5ae0', '#3ab0ff', '#b0f0ff', '#ffffff'],
    'bich_ngoc': ['#032e26', '#0a8a6a', '#2ae0b0', '#b8ffe8', '#ffffff'],
    'kim_quang': ['#3a1a02', '#b86a0a', '#ffb830', '#fff0b0', '#ffffff'],
}


def C(h):
    return np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)], np.float32)


def ramp(pal, t):
    t = np.clip(t, 0, 1) * (len(pal) - 1)
    i = np.minimum(np.floor(t).astype(int), len(pal) - 2)
    f = (t - i)[..., None]
    cols = np.array([C(c) for c in pal])
    return cols[i] * (1 - f) + cols[i + 1] * f


def seg(x0, y0, x1, y1, r0, r1=None):
    r1 = r0 if r1 is None else r1
    dx, dy = x1 - x0, y1 - y0
    L2 = dx * dx + dy * dy or 1
    t = np.clip(((X - x0) * dx + (Y - y0) * dy) / L2, 0, 1)
    return np.hypot(X - (x0 + dx * t), Y - (y0 + dy * t)) - (r0 + (r1 - r0) * t)


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


def bez(pts, n=40):
    P = np.asarray(pts, np.float32)
    out = []
    for i in range(n + 1):
        t = i / n
        Q = P.copy()
        while len(Q) > 1:
            Q = Q[:-1] * (1 - t) + Q[1:] * t
        out.append(Q[0])
    return np.array(out)


def stroke(pts, r0, r1):
    d = np.full(X.shape, 1e9, np.float32)
    n = len(pts) - 1
    for i in range(n):
        d = np.minimum(d, seg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r0 + (r1 - r0) * i / n, r0 + (r1 - r0) * (i + 1) / n))
    return d


def noise(sx, sy, seed, octaves=4):
    """nhiễu fbm kéo dài: sx, sy = cỡ hạt theo trục x / y"""
    rng = np.random.default_rng(seed)
    out = np.zeros(X.shape, np.float32)
    amp = tot = 0.0
    amp = 1.0
    for o in range(octaves):
        cx, cy = sx / 2 ** o, sy / 2 ** o
        g = rng.random((int(H / cy) + 4, int(W / cx) + 4)).astype(np.float32)
        out += ndimage.map_coordinates(g, [Y / cy, X / cx], order=3, mode='wrap') * amp
        tot += amp
        amp *= 0.5
    out /= tot
    return (out - out.min()) / (out.max() - out.min() + 1e-6)


def cov(d, soft=1.0):
    return np.clip(0.5 - d / soft, 0, 1)


# ---------------------------------------------------------------- dáng lưỡi
def blade_poly(x0, x1, w0, wmax_at, wmax, tip_len, n=48):
    """Lưỡi đối xứng: nửa bề rộng gốc w0 → rộng nhất wmax tại wmax_at → thuôn mềm vào mũi (tip_len cuối)."""
    xs = np.linspace(x0, x1, n)
    hw = []
    for x in xs:
        if x <= wmax_at:
            w = w0 + (wmax - w0) * math.sin((x - x0) / max(1, wmax_at - x0) * math.pi / 2)
        else:
            t = (x - wmax_at) / (x1 - wmax_at)
            body = wmax * (1 - 0.16 * t)
            tip0 = (x1 - tip_len - wmax_at) / (x1 - wmax_at)
            w = body if t < tip0 else body * (1 - (t - tip0) / (1 - tip0)) ** 0.75
        hw.append(max(0.0, w))
    up = [(x, CY - w) for x, w in zip(xs, hw)]
    dn = [(x, CY + w) for x, w in reversed(list(zip(xs, hw)))]
    return poly([v for pt in up + dn for v in pt])


def leaf(cx, cy, ang, L, w):
    """lông vũ / lá: hình thoi cong, gốc tại (cx,cy) dài L theo góc ang"""
    c, s_ = math.cos(ang), math.sin(ang)
    pts = []
    for i in range(13):
        t = i / 12
        pts.append((t * L, w * math.sin(math.pi * t) ** 0.8))
    for i in range(12, -1, -1):
        t = i / 12
        pts.append((t * L, -w * 0.6 * math.sin(math.pi * t) ** 0.9))
    return poly([v for x, y in pts for v in (cx + x * c - y * s_, cy + x * s_ + y * c)])


def glyph(x0, y0, sz, rng):
    """một chữ phù văn: 3–5 nét ngẫu nhiên trong ô vuông"""
    d = np.full(X.shape, 1e9, np.float32)
    g = sz / 4
    for _ in range(rng.integers(3, 6)):
        k = rng.integers(0, 5)
        a, b = rng.integers(0, 5, size=2) * g
        if k == 0:
            d = np.minimum(d, seg(x0, y0 + a, x0 + sz, y0 + a, 1.5))
        elif k == 1:
            d = np.minimum(d, seg(x0 + a, y0, x0 + a, y0 + sz, 1.5))
        elif k == 2:
            d = np.minimum(d, seg(x0 + a, y0, x0 + b, y0 + sz, 1.4))
        elif k == 3:
            d = np.minimum(d, np.abs(np.maximum(np.abs(X - x0 - sz / 2), np.abs(Y - y0 - sz / 2)) - sz * 0.28) - 1.2)
        else:
            d = np.minimum(d, np.hypot(X - x0 - a, Y - y0 - b) - 2)
    return d


def tendril_set(x, n, spread, length, seed, w=4.5):
    rng = np.random.default_rng(seed)
    out = []
    for k in range(n):
        o = (k - (n - 1) / 2)
        a = rng.uniform(-1, 1)
        out.append((bez([(x, CY + o * 3), (x - length * 0.3, CY + o * spread * 0.4 + a * 10), (x - length * 0.65, CY + o * spread * 0.75 - a * 16), (x - length + abs(o) * 8, CY + o * spread + a * 12)]), w))
    return out


# ---------------------------------------------------------------- 3 thanh kiếm
def shape_long_hon():
    blade = blade_poly(448, 965, 18, 486, 23, 130)
    # đầu rồng (nhìn ngang, hướng phải): sọ + mõm, hàm dưới há, mắt có gờ mày, 2 sừng, bờm lửa, râu cằm
    skull = poly([456, CY - 6, 448, CY - 18, 424, CY - 25, 398, CY - 36, 378, CY - 52, 350, CY - 50, 326, CY - 30, 328, CY - 8, 372, CY - 3])
    jaw = poly([450, CY + 8, 424, CY + 14, 394, CY + 24, 364, CY + 30, 336, CY + 20, 338, CY + 6, 372, CY + 5])
    fang = np.minimum(poly([432, CY - 8, 436, CY + 4, 426, CY - 6]), poly([414, CY + 13, 418, CY + 2, 408, CY + 12]))
    horn1 = stroke(bez([(362, CY - 48), (340, CY - 82), (306, CY - 102), (266, CY - 102)]), 8, 1.4)
    horn2 = stroke(bez([(348, CY - 44), (320, CY - 66), (288, CY - 72), (252, CY - 64)]), 6, 1)
    mane = np.minimum.reduce([leaf(332, CY - 34, math.pi + 0.55, 56, 10), leaf(326, CY - 16, math.pi + 0.28, 66, 10),
                              leaf(326, CY + 2, math.pi + 0.02, 60, 9), leaf(332, CY + 18, math.pi - 0.3, 50, 8),
                              leaf(356, CY + 28, math.pi - 0.95, 36, 6), leaf(344, CY + 26, math.pi - 0.7, 42, 6)])
    head = np.minimum.reduce([skull, jaw, horn1, horn2, mane])
    eye = np.hypot((X - 390) / 1.3, Y - (CY - 28)) - 4.5
    brow = stroke(bez([(404, CY - 34), (390, CY - 40), (374, CY - 38)]), 2.2, 1.2)
    whisk = np.minimum(stroke(bez([(452, CY - 12), (430, CY - 64), (350, CY - 104), (250, CY - 82)]), 2.4, 0.4),
                       stroke(bez([(450, CY + 12), (428, CY + 60), (350, CY + 98), (246, CY + 76)]), 2.4, 0.4))
    # 2 dải khí xoắn quanh thân (lớp trước sáng, lớp sau mờ)
    xs = np.linspace(462, 905, 120)
    front = np.zeros(X.shape, np.float32)
    back = np.zeros(X.shape, np.float32)
    for ph in (0, math.pi):
        prev = None
        for x in xs:
            t = (x - 462) / 443
            A = 36 * (1 - t) + 8
            th = t * 5.2 * math.pi + ph
            y = CY + A * math.sin(th)
            if prev is not None:
                d = seg(prev[0], prev[1], x, y, 3.2 * (1 - 0.6 * t) + 0.6)
                c = cov(d)
                if math.cos(th) > 0:
                    front = np.maximum(front, c)
                else:
                    back = np.maximum(back, c)
            prev = (x, y)
    return dict(blade=blade, hilt=head, base=448, tip=965, tails=[],
                extra=[(cov(eye) * 2.2, 0), (cov(brow) * 0.9, 0), (cov(whisk) * 0.9, 1), (front * 1.1, 1), (back * 0.35, 1), (cov(fang) * 0.9, 0)])


def shape_phu_van():
    blade = blade_poly(432, 962, 21, 462, 26, 140)
    rng = np.random.default_rng(8)
    runes = np.full(X.shape, 1e9, np.float32)
    for i in range(9):
        x0 = 470 + i * 44
        runes = np.minimum(runes, glyph(x0, CY - 11, 22, rng))
    # mặt cắt pha lê: các vạch chéo chia thân thành mảnh, mảnh sáng tối xen kẽ
    k = (X * 0.9 - (Y - CY) * 1.4) / 46
    facet = (np.floor(k) % 2) * 0.12 + 0.02
    facet_line = np.exp(-((k - np.round(k)) * 46 / 1.6) ** 2) * 0.6
    # đĩa bát quái
    gx = 404
    r = np.hypot(X - gx, Y - CY)
    ang = np.arctan2(Y - CY, X - gx)
    octa = np.abs(r * np.cos(((ang + math.pi / 8) % (math.pi / 4)) - math.pi / 8) - 44) - 3.2
    tri = np.full(X.shape, 1e9, np.float32)
    rr = np.random.default_rng(4)
    for i in range(8):
        a = i * math.pi / 4
        c, s_ = math.cos(a), math.sin(a)
        for j, rad in enumerate((26, 31, 36)):
            broken = rr.random() < 0.5
            for lo, hi in ([(-7, -2), (2, 7)] if broken else [(-7, 7)]):
                x1, y1 = gx + c * rad - s_ * lo, CY + s_ * rad + c * lo
                x2, y2 = gx + c * rad - s_ * hi, CY + s_ * rad + c * hi
                tri = np.minimum(tri, seg(x1, y1, x2, y2, 1.4))
    yin = (r < 15) & (((X - gx > 0) & (np.hypot(X - gx, Y - CY + 7.5) > 7.5)) | (np.hypot(X - gx, Y - CY - 7.5) <= 7.5)) & ~(np.hypot(X - gx, Y - CY + 7.5) <= 7.5)
    disc = np.minimum(octa, np.abs(r - 15) - 1.6)
    grip = seg(320, CY, gx - 46, CY, 8, 9)
    pommel = poly([300, CY, 314, CY - 14, 328, CY, 314, CY + 14])
    hilt = np.minimum.reduce([disc, grip, pommel])
    # mảnh tinh thể lơ lửng
    shards = np.full(X.shape, 1e9, np.float32)
    for (x, y, a, L) in [(520, CY - 62, 0.4, 26), (610, CY + 60, -0.3, 22), (700, CY - 58, 0.2, 18), (790, CY + 52, -0.5, 16), (470, CY + 66, -0.6, 20), (860, CY - 44, 0.5, 14)]:
        c, s_ = math.cos(a), math.sin(a)
        shards = np.minimum(shards, poly([x + c * L, y + s_ * L, x - s_ * 5, y + c * 5, x - c * L, y - s_ * L, x + s_ * 5, y - c * 5]))
    cb = cov(blade)
    return dict(blade=blade, hilt=hilt, base=432, tip=962, tails=tendril_set(296, 4, 26, 190, 6),
                extra=[(cov(runes) * cb * 1.4, 0), (facet * cb + facet_line * cb, 1), (cov(tri) * 1.1, 1), (yin.astype(np.float32) * 0.9, 1), (cov(shards) * 0.85, 1)])


def shape_phuong_vu():
    blade = blade_poly(430, 960, 17, 470, 24, 140)
    # cánh phượng: 5 lông vũ mỗi bên, xòe ra sau
    feathers = np.full(X.shape, 1e9, np.float32)
    quill = np.full(X.shape, 1e9, np.float32)
    for sgn in (-1, 1):
        for i in range(5):
            a = math.pi + sgn * (0.35 + i * 0.22)
            L = 70 + i * 16
            feathers = np.minimum(feathers, leaf(426, CY + sgn * 6, a, L, 10 - i * 0.6))
            quill = np.minimum(quill, seg(426, CY + sgn * 6, 426 + math.cos(a) * L * 0.9, CY + sgn * 6 + math.sin(a) * L * 0.9, 0.8))
    crest = np.hypot(X - 428, Y - CY) - 12
    hilt = np.minimum(feathers, crest)
    # đuôi phượng: 3 dải dài uốn lượn có "mắt" ở cuối
    tails = []
    ends = []
    for k, dy in enumerate((-34, 0, 34)):
        end = (96, CY + dy * 2.0)
        tails.append((bez([(390, CY + dy * 0.2), (310, CY + dy * 1.2 - 20), (210, CY + dy * 1.6 + 24), end]), 5.5))
        ends.append(end)
    # mắt lông công ở đầu mút đuôi: vòng ngoài + đồng tử
    eyes = np.minimum.reduce([np.minimum(np.abs(np.hypot((X - ex) / 1.4, Y - ey) - 9) - 2, np.hypot(X - ex, Y - ey) - 3.5) for ex, ey in ends])
    # mép lưỡi liếm lửa: nhiễu kéo dài, chỉ ở ngoài mép
    flames = np.clip((noise(36, 10, 31) - 0.42) * 3, 0, 1) * np.exp(-np.clip(blade, 0, None) / 9) * (blade > 0)
    return dict(blade=blade, hilt=hilt, base=430, tip=960, tails=tails,
                extra=[(cov(quill) * 0.9, 0), (flames * np.clip((X - 440) / 80, 0, 1) * np.clip((945 - X) / 60, 0, 1) * 0.95, 1), (cov(eyes) * 1.3, 0), (np.exp(-np.clip(crest + 4, 0, None) / 3) * cov(crest) * 0.9, 0)])


SHAPES = {'long_hon': (shape_long_hon, 'thanh_lam'), 'phu_van': (shape_phu_van, 'tu_linh'), 'phuong_vu': (shape_phuong_vu, 'kim_hoa')}


def render(shape, pal):
    blade, hilt, base, tip = shape['blade'], shape['hilt'], shape['base'], shape['tip']
    tend = np.full(X.shape, 1e9, np.float32)
    for pts, w in shape['tails']:
        tend = np.minimum(tend, stroke(pts, w, 0.4))
    flow = noise(70, 7, 11)
    flow2 = noise(26, 4, 12)
    inside = np.clip(-blade, 0, None)
    cb = cov(blade)
    upper = (Y < CY).astype(np.float32)
    bevel = cb * (0.15 * upper + 0.03 * (1 - upper))
    rim = np.exp(-inside / 2.2) * cb
    body = cb * (0.07 + 0.36 * (flow * flow2) ** 1.4) + bevel
    ridge = np.exp(-((Y - CY) ** 2) / 3.0) * cov(blade + 4) * np.clip((X - base - 8) / 30, 0, 1)
    tipk = np.clip((X - (tip - 260)) / 260, 0, 1) ** 2
    I = np.maximum(rim * 0.95, body) + ridge * 1.0 + tipk * cb * 0.18
    hin = np.clip(-hilt, 0, None)
    I += cov(hilt) * (0.14 + 0.3 * flow) + np.exp(-hin / 2.0) * cov(hilt) * 0.8
    I += cov(tend) * (0.3 + 0.55 * noise(40, 10, 13)) * np.clip((X + 60) / 200, 0, 1)
    mask = np.clip(cb + cov(hilt) * 0.7 + cov(tend) * 0.5, 0, 1)
    for arr, glows in shape['extra']:
        I += arr
        if glows:
            mask = np.clip(mask + arr * 0.5, 0, 1)
    glow = ndimage.gaussian_filter(mask, 6) * 0.5 + ndimage.gaussian_filter(mask, 22) * 0.4
    sp = np.zeros(X.shape, np.float32)
    rr = np.random.default_rng(21)
    for _ in range(46):
        x = rr.uniform(base - 60, tip - 20)
        y = CY + rr.choice([-1, 1]) * rr.uniform(20, 60) * (1 if x < tip - 140 else (tip - x) / 140 + 0.2)
        r = rr.uniform(0.8, 2.0)
        sp += np.exp(-((X - x) ** 2 + (Y - y) ** 2) / (2 * r * r)) * rr.uniform(0.5, 1)
    star = (np.exp(-np.abs(Y - CY) / 1.3) * np.exp(-np.abs(X - tip) / 40) + np.exp(-np.abs(X - tip) / 1.3) * np.exp(-np.abs(Y - CY) / 26)) * 0.9
    total = I + glow * 0.75 + sp * 0.85 + star
    col = ramp(PALETTES[pal], np.clip(total, 0, 1.4) * 0.62)
    alpha = np.clip(total * 1.05, 0, 1)
    return np.dstack([col * alpha[..., None], alpha])


os.makedirs(OUT, exist_ok=True)
imgs = {}
for name, (f, pal) in SHAPES.items():
    rgba = render(f(), pal)
    imgs[name] = rgba
    a = rgba[..., 3:4]
    straight = np.where(a > 1e-4, rgba[..., :3] / np.maximum(a, 1e-4), 0)
    Image.fromarray((np.dstack([np.clip(straight, 0, 1), a[..., 0]]) * 255).astype(np.uint8), 'RGBA').save(os.path.join(OUT, f'qi_sword_{name}.png'))

# ---------------------------------------------------------------- ảnh xem trước
from PIL import ImageDraw, ImageFont
hero = Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA').crop((6 * 52, 0, 7 * 52, 68))
labels = {'long_hon': '1 · Long Hồn Kiếm', 'phu_van': '2 · Phù Văn Kiếm', 'phuong_vu': '3 · Phượng Vũ Kiếm'}
RW, RH = 1180, 360
sheet = Image.new('RGB', (RW, RH * 3), (12, 11, 22))
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
except Exception:
    font = ImageFont.load_default()
for j, (name, rgba) in enumerate(imgs.items()):
    bg = np.zeros((RH, RW, 3), np.float32)
    bg[:] = C('#0e0d1c')
    big = np.array(Image.fromarray((np.clip(rgba[..., :3], 0, 1) * 255).astype(np.uint8)).resize((820, 256), Image.LANCZOS)).astype(np.float32) / 255
    bg[60:316, 20:840] = np.clip(bg[60:316, 20:840] + big, 0, 1)
    tile = np.zeros((RH, 300, 3), np.float32)
    tile[:] = C('#1a1828')
    small = np.array(Image.fromarray((np.clip(rgba[..., :3], 0, 1) * 255).astype(np.uint8)).resize((280, 88), Image.LANCZOS).rotate(28, expand=True)).astype(np.float32) / 255
    sh, sw = small.shape[:2]
    h2, w2 = min(sh, RH - 30), min(sw, 300)
    tile[30:30 + h2, :w2] = np.clip(tile[30:30 + h2, :w2] + small[:h2, :w2], 0, 1)
    bg[:, 860:1160] = tile
    im = Image.fromarray((bg * 255).astype(np.uint8))
    hz = hero.resize((52 * 3, 68 * 3), Image.NEAREST)
    im.paste(hz, (860 + 170, 140), hz)
    d = ImageDraw.Draw(im)
    d.text((24, 18), labels[name], fill=(255, 230, 160), font=font)
    d.text((872, 18), 'cỡ trong trận', fill=(160, 160, 200), font=font)
    sheet.paste(im, (0, j * RH))
sheet.save(os.path.join(OUT, 'qi_sword_preview.png'))
print('ok')
