"""
Kiếm khí ÁNH SÁNG — bám theo ảnh mẫu tools/art/ref/qi_sword_ref2.png (kiếm sáng trắng xòe nan quạt quanh người).

  python3 -I tools/art/qi_sword_light.py → tools/art/out/qi_sword_light.png (RGBA tiền nhân alpha, mũi hướng phải, 1024x320;
                                            dùng hòa trộn CỘNG trong game)
                                            + tools/art/out/qi_sword_light_preview.png (so mẫu, nan quạt, nền trận)

Đặc điểm lấy từ mẫu:
  • kiếm thuần ánh sáng: lõi trắng chói (cháy sáng), quầng rất rộng mềm ngả tím lavender, mép nhòe vì chói
  • dáng kiếm cổ: lưỡi dài thẳng thuôn nhẹ, mũi nhọn thuôn dần; khâu ngắn hơi cụp về phía lưỡi, 2 đầu tròn phình;
    chuôi hơi phình, núm tròn — chuôi sáng dịu hơn lưỡi để vẫn đọc ra hình
  • xung quanh: sợi khí mảnh uốn lượn như khói, bụi sáng li ti
"""
import math
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
W, H = 1024, 320
SS = 2
YY, XX = np.mgrid[0:H * SS, 0:W * SS].astype(np.float32)
X, Y = (XX + 0.5) / SS, (YY + 0.5) / SS
CY = 160.0


def C(h):
    return np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)], np.float32)


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


def cov(d, soft=0.8):
    return np.clip(0.5 - d / soft, 0, 1)


def blur(a, s):
    return ndimage.gaussian_filter(a, s * SS)


# ---------------------------------------------------------------- hình kiếm (dáng kiếm cổ như mẫu)
GX = 300                 # khâu
TIP = 990
TB = 860                 # bắt đầu thuôn mũi
hw0, hw1 = 18, 15      # nửa bề rộng gốc / chỗ bắt đầu thuôn
xs = np.linspace(GX + 6, TIP, 60)
up, dn = [], []
for x in xs:
    if x < TB:
        w = hw0 + (hw1 - hw0) * (x - GX) / (TB - GX)
    else:
        t = (x - TB) / (TIP - TB)
        w = hw1 * (1 - t) ** 0.85
    up.append((x, CY - w))
    dn.append((x, CY + w))
blade = poly([v for p in up + dn[::-1] for v in p])
# khâu: thanh ngắn hơi cụp về phía lưỡi, 2 đầu tròn phình
guard = np.minimum.reduce([
    stroke(bez([(GX + 6, CY - 34), (GX - 4, CY - 18), (GX - 6, CY), (GX - 4, CY + 18), (GX + 6, CY + 34)]), 6.5, 6.5),
    np.hypot(X - (GX + 9), Y - (CY - 36)) - 8.5,
    np.hypot(X - (GX + 9), Y - (CY + 36)) - 8.5,
    np.hypot(X - (GX - 2), Y - CY) - 10,
])
grip = stroke(bez([(GX - 10, CY), (GX - 50, CY), (GX - 90, CY)]), 8, 7)
grip = np.minimum(grip, np.hypot((X - (GX - 50)) / 2.6, Y - CY) - 9.5)            # hơi phình giữa chuôi
pommel = np.hypot((X - (GX - 104)) / 1.2, Y - CY) - 12
hilt = np.minimum.reduce([guard, grip, pommel])
whole = np.minimum(blade, hilt)


def make_layers():
    cb, ch = cov(blade), cov(hilt)
    # lõi: lưỡi chói (1.6), chuôi dịu hơn (0.9); mép lưỡi sáng gắt
    inside = np.clip(-blade, 0, None)
    core = cb * (1.35 + 0.35 * np.exp(-inside / 2.5)) + ch * 0.95
    ridge = np.exp(-((Y - CY) ** 2) / 1.8) * cb * 0.25                       # sống kiếm hơi đậm (chừa nhẹ)
    core = core - ridge * 0.55
    # quầng: 3 lớp mềm, rất rộng như mẫu
    src = np.clip(cb + ch * 0.75, 0, 1).astype(np.float32)
    core_soft = blur(core, 1.2)
    bloom = blur(src, 3) * 1.4 + blur(src, 10) * 1.2 + blur(src, 26) * 1.0 + blur(src, 55) * 0.7
    # sợi khí mảnh uốn lượn quanh thân
    rng = np.random.default_rng(9)
    wisp = np.zeros(X.shape, np.float32)
    for k in range(5):
        x0 = rng.uniform(GX - 120, TIP - 200)
        y0 = CY + rng.choice([-1, 1]) * rng.uniform(18, 70)
        L = rng.uniform(160, 340)
        amp = rng.uniform(18, 40)
        ph = rng.uniform(0, 6.28)
        fr = rng.uniform(1.6, 3.2)
        pts = [(x0 + L * t, y0 + amp * math.sin(ph + t * fr) + (CY - y0) * 0.3 * t) for t in np.linspace(0, 1, 40)]
        d = stroke(pts, 2.4, 0.6)
        fade = np.clip(np.abs(X - (x0 + L / 2)) / (L / 2), 0, 1)
        wisp += cov(d, 1.4) * (1 - fade ** 2) * rng.uniform(0.35, 0.7)
    wisp = blur(wisp, 1.5) * 0.8 + blur(wisp, 7) * 1.1
    # bụi sáng li ti
    dust = np.zeros(X.shape, np.float32)
    for _ in range(70):
        x = rng.uniform(GX - 140, TIP)
        y = CY + rng.normal(0, 46)
        r = rng.uniform(0.6, 1.8)
        dust += np.exp(-((X - x) ** 2 + (Y - y) ** 2) / (2 * r * r)) * rng.uniform(0.4, 1)
    return core_soft, bloom, wisp, dust


core, bloom, wisp, dust = make_layers()
WHITE = C('#ffffff')
LAV = C('#c8c4ff')       # quầng tím lavender
LAV2 = C('#9a94e8')
# ghép: quầng (lavender) + lõi trắng chói + sợi khí + bụi; nén sáng mềm
rgb = (LAV2[None, None] * blur(bloom, 6)[..., None] * 0.35 + LAV[None, None] * bloom[..., None] * 0.55
       + WHITE[None, None] * (core[..., None] * 1.0) + C('#e4e2ff')[None, None] * (wisp * 0.75)[..., None]
       + WHITE[None, None] * (dust * 0.9)[..., None])
rgb = 1 - np.exp(-rgb * 1.25)
alpha = np.clip(rgb.max(-1) * 1.05, 0, 1)


def down(img):
    return np.asarray(Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8)).resize((W, H), Image.LANCZOS)).astype(np.float32) / 255


rgb_s = down(rgb)
os.makedirs(OUT, exist_ok=True)
# ảnh tiền nhân alpha: dùng hòa trộn CỘNG (nền đen = trong suốt)
sword_add = Image.fromarray((rgb_s * 255).astype(np.uint8), 'RGB')
a_s = down(np.repeat(alpha[..., None], 3, -1))[..., 0]
straight = np.where(a_s[..., None] > 1e-3, rgb_s / np.maximum(a_s[..., None], 1e-3), 0)
Image.fromarray((np.dstack([np.clip(straight, 0, 1), a_s]) * 255).astype(np.uint8), 'RGBA').save(os.path.join(OUT, 'qi_sword_light.png'))


# ---------------------------------------------------------------- ảnh xem trước
def add_on(bg, img, x, y, ang=0.0, scale=1.0):
    """cộng ảnh sáng (nền đen) lên nền tại (x,y) = tâm ảnh"""
    im = img.resize((int(img.width * scale), int(img.height * scale)), Image.LANCZOS)
    if ang:
        im = im.rotate(ang, expand=True, resample=Image.BICUBIC)
    a = np.asarray(im).astype(np.float32) / 255
    h, w = a.shape[:2]
    x0, y0 = int(x - w / 2), int(y - h / 2)
    X0, Y0 = max(0, x0), max(0, y0)
    X1, Y1 = min(bg.shape[1], x0 + w), min(bg.shape[0], y0 + h)
    if X1 <= X0 or Y1 <= Y0:
        return
    bg[Y0:Y1, X0:X1] = 1 - (1 - bg[Y0:Y1, X0:X1]) * (1 - a[Y0 - y0:Y1 - y0, X0 - x0:X1 - x0])    # hòa trộn "screen"


try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
except Exception:
    font = ImageFont.load_default()
PW = 1200
sheet = Image.new('RGB', (PW, 1180), (12, 11, 22))
# 1) so mẫu: ảnh mẫu (thu nhỏ) | kiếm lớn trên nền giống mẫu
ref = Image.open(os.path.join(HERE, 'ref', 'qi_sword_ref2.png')).convert('RGB')
sheet.paste(ref.resize((300, 450), Image.LANCZOS), (10, 40))
bg1 = np.zeros((450, 870, 3), np.float32)
g = np.linspace(0, 1, 450)[:, None, None]
bg1[:] = C('#5a5870') * (1 - g) + C('#2a283c') * g
add_on(bg1, sword_add, 435, 225, ang=-62, scale=0.62)
add_on(bg1, sword_add, 650, 230, ang=-50, scale=0.5)
add_on(bg1, sword_add, 230, 240, ang=-78, scale=0.48)
sheet.paste(Image.fromarray((bg1 * 255).astype(np.uint8)), (320, 40))
d = ImageDraw.Draw(sheet)
d.text((14, 8), 'Ảnh mẫu', fill=(255, 230, 160), font=font)
d.text((330, 8), 'Bản vẽ (cùng tông nền, xoay cùng góc)', fill=(255, 230, 160), font=font)
# 2) nan quạt quanh nhân vật trên nền trận (cỡ thật ×3)
bg2 = np.zeros((420, 640, 3), np.float32)
bg2[:] = C('#14121f')
hero = Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA').crop((6 * 52, 0, 7 * 52, 68)).resize((156, 204), Image.NEAREST)
for i in range(9):
    a = -160 + i * 17.5
    r = 150
    cx, cy = 320 + math.cos(math.radians(a)) * r, 250 + math.sin(math.radians(a)) * r * 0.75
    add_on(bg2, sword_add, cx, cy, ang=-a, scale=0.26)
im2 = Image.fromarray((bg2 * 255).astype(np.uint8)).convert('RGBA')
im2.alpha_composite(hero, (242, 160))
sheet.paste(im2.convert('RGB'), (10, 540))
d.text((20, 548), 'Nan quạt quanh nhân vật (nền trận, cỡ thật ×3)', fill=(255, 230, 160), font=font)
# 3) kiếm lớn trên nền tối
bg3 = np.zeros((420, 540, 3), np.float32)
bg3[:] = C('#14121f')
add_on(bg3, sword_add, 270, 230, ang=-35, scale=0.52)
sheet.paste(Image.fromarray((bg3 * 255).astype(np.uint8)), (660, 540))
d.text((670, 548), 'Một thanh trên nền trận', fill=(255, 230, 160), font=font)
sheet = sheet.crop((0, 0, PW, 970))
sheet.save(os.path.join(OUT, 'qi_sword_light_preview.png'))
print('ok')
