"""
Thanh kiếm CHÂN KHÍ NGƯNG TỤ (Ngự Kiếm Thuật) — không phải kiếm thật, mà là khí ngưng thành hình kiếm.

  python3 -I tools/art/qi_sword.py   → tools/art/out/qi_sword_<kiểu>.png (RGBA, mũi hướng sang phải, 1024x256)
                                       + tools/art/out/qi_sword_preview.png (3 kiểu dáng, cỡ lớn + cỡ trong trận)
  Kiểu: co_kiem (cổ kiếm thanh mảnh, khâu cánh bướm, núm mây) · phi_kiem (không chuôi, gốc tỏa đuôi khí sao chổi)
        · lieu_diep (lưỡi lá liễu, khâu vòng ngọc)

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


# ---------------------------------------------------------------- dáng kiếm
def blade_poly(x0, x1, w0, wmax_at, wmax, tip_len, n=40):
    """Lưỡi kiếm đối xứng: nửa bề rộng theo vị trí (gốc w0 → rộng nhất wmax tại wmax_at → thuôn mềm vào mũi)."""
    xs = np.linspace(x0, x1, n)
    hw = []
    for x in xs:
        if x <= wmax_at:
            w = w0 + (wmax - w0) * math.sin((x - x0) / max(1, wmax_at - x0) * math.pi / 2)
        else:
            t = (x - wmax_at) / (x1 - wmax_at)
            body = wmax * (1 - 0.18 * t)
            tip0 = (x1 - tip_len - wmax_at) / (x1 - wmax_at)
            w = body if t < tip0 else body * (1 - ((t - tip0) / (1 - tip0)) ** 1.0) ** 0.75
        hw.append(max(0.0, w))
    up = [(x, CY - w) for x, w in zip(xs, hw)]
    dn = [(x, CY + w) for x, w in reversed(list(zip(xs, hw)))]
    return poly([v for pt in up + dn for v in pt]), xs, hw


def shape_co_kiem():
    blade, xs, hw = blade_poly(400, 945, 19, 440, 22, 120)
    g = 394
    # khâu cánh bướm: hai cánh đặc, mũi vút về phía lưỡi
    wing = lambda s_: poly([g + 16, CY, g + 6, CY - s_ * 16, g + 20, CY - s_ * 42, g + 4, CY - s_ * 46, g - 10, CY - s_ * 30, g - 14, CY])
    guard = np.minimum(wing(1), wing(-1))
    bead = np.hypot(X - g, Y - CY) - 9
    grip = seg(300, CY, g - 10, CY, 9, 10)
    pommel = np.minimum.reduce([np.hypot(X - 288, Y - CY) - 12, np.hypot(X - 280, Y - CY + 15) - 8, np.hypot(X - 280, Y - CY - 15) - 8])
    hilt = np.minimum.reduce([guard, bead, grip, pommel])
    tails = [bez([(272, CY + k * 4), (220, CY + k * 10 + 8 * math.sin(k)), (160, CY + k * 18 - 10 * math.cos(k)), (100 + abs(k) * 10, CY + k * 28)]) for k in (-2, -1, 0, 1, 2)]
    return dict(blade=blade, hilt=hilt, tails=tails, tail_w=4.5, wrap=grip, base=400, tip=945)


def shape_phi_kiem():
    blade, xs, hw = blade_poly(380, 955, 8, 470, 24, 125)
    hooks = np.minimum(
        stroke(bez([(462, CY - 16), (450, CY - 36), (428, CY - 36), (426, CY - 22)]), 7, 2.5),
        stroke(bez([(462, CY + 16), (450, CY + 36), (428, CY + 36), (426, CY + 22)]), 7, 2.5))
    rng = np.random.default_rng(5)
    tails = []
    for k in range(-3, 4):
        a = rng.uniform(-1, 1)
        tails.append(bez([(400, CY + k * 3), (310, CY + k * 10 + a * 10), (210, CY + k * 18 - a * 18), (110 - abs(k) * 6, CY + k * 30 + a * 14)]))
    return dict(blade=blade, hilt=hooks, tails=tails, tail_w=8.0, wrap=None, base=380, tip=955)


def shape_lieu_diep():
    blade, xs, hw = blade_poly(412, 935, 12, 640, 34, 190)
    ring = np.abs(np.hypot(X - 392, Y - CY) - 21) - 5
    grip = seg(312, CY, 368, CY, 8.5, 9.5)
    pommel = np.hypot(X - 300, Y - CY) - 11
    hilt = np.minimum.reduce([ring, grip, pommel])
    tails = [bez([(288, CY + k * 4), (240, CY + k * 12), (180, CY + k * 20 + 12 * math.sin(k * 2)), (120 + abs(k) * 8, CY + k * 30)]) for k in (-2, -1, 0, 1, 2)]
    return dict(blade=blade, hilt=hilt, tails=tails, tail_w=4.5, wrap=grip, base=412, tip=935)


SHAPES = {'co_kiem': shape_co_kiem, 'phi_kiem': shape_phi_kiem, 'lieu_diep': shape_lieu_diep}
PAL = PALETTES['thanh_lam']


def render(shape, pal=PAL):
    blade, hilt, base, tip = shape['blade'], shape['hilt'], shape['base'], shape['tip']
    tend = np.full(X.shape, 1e9, np.float32)
    for pts in shape['tails']:
        tend = np.minimum(tend, stroke(pts, shape['tail_w'], 0.4))
    flow = noise(70, 7, 11)
    flow2 = noise(26, 4, 12)
    inside = np.clip(-blade, 0, None)
    cb = cov(blade)
    # sống kiếm hình thoi: nửa trên đón sáng, nửa dưới khuất → ra khối
    upper = (Y < CY).astype(np.float32)
    bevel = cb * (0.16 * upper + 0.04 * (1 - upper))
    rim = np.exp(-inside / 2.2) * cb
    body = cb * (0.08 + 0.38 * (flow * flow2) ** 1.4) + bevel
    ridge = np.exp(-((Y - CY) ** 2) / 3.0) * cov(blade + 4) * np.clip((X - base - 8) / 30, 0, 1)
    tipk = np.clip((X - (tip - 260)) / 260, 0, 1) ** 2
    I_blade = np.maximum(rim * 0.95, body) + ridge * 1.1 + tipk * cb * 0.18
    hin = np.clip(-hilt, 0, None)
    I_hilt = cov(hilt) * (0.12 + 0.3 * flow) + np.exp(-hin / 2.0) * cov(hilt) * 0.8
    if shape['wrap'] is not None:                                      # chuôi quấn: sọc chéo bằng khí
        wrap = cov(shape['wrap']) * (np.sin((X + Y * 0.8) * 0.45) * 0.5 + 0.5) * 0.25
        I_hilt += wrap
    I_tend = cov(tend) * (0.3 + 0.55 * noise(40, 10, 13)) * np.clip((X - 6) / 180, 0, 1)
    outside = np.clip(blade, 0, None)
    streak = np.clip((noise(90, 5, 14) - 0.45) * 2.6, 0, 1) * np.clip((noise(40, 9, 15) - 0.3) * 2, 0, 1)
    I_wisp = streak * np.exp(-outside / 6) * (outside > 0) * np.clip((X - base + 20) / 120, 0, 1) * np.clip((tip - 30 - X) / 80, 0, 1) * 0.8
    I = I_blade + I_hilt + I_tend + I_wisp
    mask = np.clip(cb + cov(hilt) * 0.7 + cov(tend) * 0.5 + I_wisp * 0.6, 0, 1)
    glow = ndimage.gaussian_filter(mask, 6) * 0.5 + ndimage.gaussian_filter(mask, 20) * 0.38
    sp = np.zeros(X.shape, np.float32)
    rr = np.random.default_rng(21)
    for _ in range(40):
        x = rr.uniform(base - 40, tip - 20)
        y = CY + rr.choice([-1, 1]) * rr.uniform(16, 40) * (1 if x < tip - 140 else (tip - x) / 140 + 0.2)
        r = rr.uniform(0.8, 2.0)
        sp += np.exp(-((X - x) ** 2 + (Y - y) ** 2) / (2 * r * r)) * rr.uniform(0.5, 1)
    star = (np.exp(-np.abs(Y - CY) / 1.3) * np.exp(-np.abs(X - tip) / 36) + np.exp(-np.abs(X - tip) / 1.3) * np.exp(-np.abs(Y - CY) / 22)) * 0.85
    total = I + glow * 0.75 + sp * 0.85 + star
    col = ramp(pal, np.clip(total, 0, 1.4) * 0.62)
    alpha = np.clip(total * 1.05, 0, 1)
    return np.dstack([col * alpha[..., None], alpha])


os.makedirs(OUT, exist_ok=True)
imgs = {}
for name, f in SHAPES.items():
    rgba = render(f())
    imgs[name] = rgba
    a = rgba[..., 3:4]
    straight = np.where(a > 1e-4, rgba[..., :3] / np.maximum(a, 1e-4), 0)
    Image.fromarray((np.dstack([np.clip(straight, 0, 1), a[..., 0]]) * 255).astype(np.uint8), 'RGBA').save(os.path.join(OUT, f'qi_sword_{name}.png'))

# ---------------------------------------------------------------- ảnh xem trước
from PIL import ImageDraw, ImageFont
hero = Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA').crop((6 * 52, 0, 7 * 52, 68))
labels = {'co_kiem': '1 · Cổ kiếm', 'phi_kiem': '2 · Phi kiếm (đuôi khí sao chổi)', 'lieu_diep': '3 · Liễu diệp (lá liễu, vòng ngọc)'}
RW, RH = 1180, 330
sheet = Image.new('RGB', (RW, RH * 3), (12, 11, 22))
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
except Exception:
    font = ImageFont.load_default()
for j, (name, rgba) in enumerate(imgs.items()):
    bg = np.zeros((RH, RW, 3), np.float32)
    bg[:] = C('#0e0d1c')
    big = np.array(Image.fromarray((np.clip(rgba[..., :3], 0, 1) * 255).astype(np.uint8)).resize((820, 205), Image.LANCZOS)).astype(np.float32) / 255
    bg[60:265, 20:840] = np.clip(bg[60:265, 20:840] + big, 0, 1)
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
    sheet.paste(im, (0, j * RH))
sheet.save(os.path.join(OUT, 'qi_sword_preview.png'))
print('ok')
