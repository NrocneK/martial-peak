"""
Thanh kiếm CHÂN KHÍ NGƯNG TỤ (Ngự Kiếm Thuật) — không phải kiếm thật, mà là khí ngưng thành hình kiếm.

  python3 -I tools/art/qi_sword.py   → tools/art/out/qi_sword_<màu>.png (RGBA, mũi hướng sang phải, 1024x256)
                                       + tools/art/out/qi_sword_preview.png (3 phương án màu, cỡ lớn + cỡ trong trận)

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
W, H = 1024, 256
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
X, Y = XX + 0.5, YY + 0.5
CY = 128.0

PALETTES = {
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


# ---------------------------------------------------------------- hình kiếm
TIP = 968
GUARD = 300
hw = lambda x: 25 - (x - GUARD) * 0.006                    # bản kiếm thuôn nhẹ
TIP0 = 850
blade = poly([GUARD, CY - hw(GUARD), TIP0, CY - hw(TIP0), TIP, CY, TIP0, CY + hw(TIP0), GUARD, CY + hw(GUARD)])
ridge = seg(GUARD + 6, CY, TIP - 14, CY, 0.5, 0.2)
# khâu kiếm: 2 cánh khí cong vút về sau
wing_up = stroke(bez([(GUARD + 8, CY - 10), (GUARD - 6, CY - 44), (GUARD - 40, CY - 70), (GUARD - 78, CY - 78)]), 9, 1.2)
wing_dn = stroke(bez([(GUARD + 8, CY + 10), (GUARD - 6, CY + 44), (GUARD - 40, CY + 70), (GUARD - 78, CY + 78)]), 9, 1.2)
guard = np.minimum(np.minimum(wing_up, wing_dn), seg(GUARD - 4, CY - 22, GUARD - 4, CY + 22, 8))
grip = seg(190, CY, GUARD - 10, CY, 8.5, 9.5)
pommel = np.hypot(X - 176, Y - CY) - 15
hilt = np.minimum(np.minimum(guard, grip), pommel)
# sợi khí tan ra sau núm kiếm
rng = np.random.default_rng(3)
tendrils = np.full(X.shape, 1e9, np.float32)
for k in range(5):
    off = (k - 2) * 9
    pts = bez([(168, CY + off * 0.4), (120, CY + off + rng.uniform(-14, 14)), (70, CY + off * 1.8 + rng.uniform(-20, 20)), (18 + k * 6, CY + off * 2.6 + rng.uniform(-24, 24))])
    tendrils = np.minimum(tendrils, stroke(pts, 4.5, 0.4))


def render(pal):
    flow = noise(70, 7, 11)                                  # luồng khí chảy dọc thân
    flow2 = noise(26, 4, 12)
    # --- thân kiếm: viền lưỡi sáng gắt + lòng mờ có luồng chảy
    inside = np.clip(-blade, 0, None)
    rim = np.exp(-inside / 2.6) * cov(blade)                 # mép lưỡi
    body = cov(blade) * (0.10 + 0.42 * (flow * flow2) ** 1.4 + 0.12 * np.exp(-np.abs(Y - CY) / 5))
    core = np.exp(-(ridge + 1.2).clip(0) ** 2 / 6) * cov(blade + 3)
    # mũi kiếm sáng dần
    tipk = np.clip((X - 700) / (TIP - 700), 0, 1) ** 2
    I_blade = np.maximum(rim * 0.95, body) + core * 1.1 + tipk * cov(blade) * 0.2
    # --- chuôi: khí mờ hơn, có viền
    hin = np.clip(-hilt, 0, None)
    I_hilt = cov(hilt) * (0.12 + 0.3 * flow) + np.exp(-hin / 2.2) * cov(hilt) * 0.8
    I_hilt += np.exp(-np.clip(pommel + 6, 0, None) / 3) * cov(pommel) * 0.35
    I_tend = cov(tendrils) * (0.35 + 0.5 * noise(40, 10, 13)) * np.clip((X - 10) / 160, 0, 1)
    # khí bốc ra dọc mép lưỡi, trôi về phía chuôi (vệt nhiễu kéo dài theo thân, mờ dần khi xa mép)
    outside = np.clip(blade, 0, None)
    streak = np.clip((noise(90, 5, 14) - 0.45) * 2.6, 0, 1) * np.clip((noise(40, 9, 15) - 0.3) * 2, 0, 1)
    I_wisp = streak * np.exp(-outside / 7) * (outside > 0) * np.clip((X - GUARD + 40) / 120, 0, 1) * np.clip((TIP - 30 - X) / 80, 0, 1) * 0.9
    I = I_blade + I_hilt + I_tend + I_wisp
    # --- quầng sáng
    mask = np.clip(cov(blade) + cov(hilt) * 0.7 + cov(tendrils) * 0.5 + I_wisp * 0.6, 0, 1)
    glow = ndimage.gaussian_filter(mask, 7) * 0.55 + ndimage.gaussian_filter(mask, 22) * 0.4
    # --- hạt khí dọc lưỡi + chớp sáng ở mũi
    sp = np.zeros(X.shape, np.float32)
    rr = np.random.default_rng(21)
    for _ in range(46):
        x = rr.uniform(GUARD - 60, TIP)
        y = CY + rr.choice([-1, 1]) * (hw(min(x, TIP0)) + rr.uniform(2, 22)) * (1 if x < TIP0 else (TIP - x) / (TIP - TIP0) + 0.2)
        r = rr.uniform(0.8, 2.2)
        sp += np.exp(-((X - x) ** 2 + (Y - y) ** 2) / (2 * r * r)) * rr.uniform(0.5, 1)
    star = np.exp(-np.abs(Y - CY) / 1.4) * np.exp(-np.abs(X - TIP) / 40) + np.exp(-np.abs(X - TIP) / 1.4) * np.exp(-np.abs(Y - CY) / 26)
    star *= 0.9
    total = I + glow * 0.75 + sp * 0.9 + star
    col = ramp(pal, np.clip(total, 0, 1.4) * 0.62)
    alpha = np.clip(total * 1.05, 0, 1)
    return np.dstack([col * alpha[..., None], alpha])         # tiền nhân alpha (nền đen = trong suốt khi cộng)


os.makedirs(OUT, exist_ok=True)
imgs = {}
for name, pal in PALETTES.items():
    rgba = render(pal)
    imgs[name] = rgba
    a = rgba[..., 3:4]
    straight = np.where(a > 1e-4, rgba[..., :3] / np.maximum(a, 1e-4), 0)
    Image.fromarray((np.dstack([np.clip(straight, 0, 1), a[..., 0]]) * 255).astype(np.uint8), 'RGBA').save(os.path.join(OUT, f'qi_sword_{name}.png'))

# ---------------------------------------------------------------- ảnh xem trước
hero = Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA').crop((6 * 52, 0, 7 * 52, 68))
labels = {'thanh_lam': 'A · Thanh Lam (xanh lam)', 'bich_ngoc': 'B · Bích Ngọc (xanh ngọc)', 'kim_quang': 'C · Kim Quang (vàng kim)'}
RW, RH = 1180, 330
sheet = Image.new('RGB', (RW, RH * 3), (12, 11, 22))
from PIL import ImageDraw, ImageFont
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
except Exception:
    font = ImageFont.load_default()
for j, (name, rgba) in enumerate(imgs.items()):
    y0 = j * RH
    bg = np.zeros((RH, RW, 3), np.float32)
    bg[:] = C('#0e0d1c')
    # cỡ lớn
    big = np.array(Image.fromarray((np.clip(rgba[..., :3], 0, 1) * 255).astype(np.uint8)).resize((820, 205), Image.LANCZOS)).astype(np.float32) / 255
    bg[60:265, 20:840] = np.clip(bg[60:265, 20:840] + big, 0, 1)
    # cỡ trong trận: nhân vật phóng 3 lần, kiếm dài ~110px game ×3 = 330
    tile = np.zeros((RH, 300, 3), np.float32)
    tile[:] = C('#1a1828')
    small = np.array(Image.fromarray((np.clip(rgba[..., :3], 0, 1) * 255).astype(np.uint8)).resize((280, 70), Image.LANCZOS).rotate(28, expand=True)).astype(np.float32) / 255
    sh, sw = small.shape[:2]
    h2, w2 = min(sh, RH - 30), min(sw, 300)
    tile[30:30 + h2, :w2] = np.clip(tile[30:30 + h2, :w2] + small[:h2, :w2], 0, 1)
    bg[:, 860:1160] = tile
    im = Image.fromarray((bg * 255).astype(np.uint8))
    hz = hero.resize((52 * 3, 68 * 3), Image.NEAREST)
    im.paste(hz, (860 + 170, 120), hz)
    d = ImageDraw.Draw(im)
    d.text((24, 18), labels[name], fill=(255, 230, 160), font=font)
    d.text((872, 18), 'cỡ trong trận', fill=(160, 160, 200), font=font)
    sheet.paste(im, (0, y0))
sheet.save(os.path.join(OUT, 'qi_sword_preview.png'))
print('ok')
