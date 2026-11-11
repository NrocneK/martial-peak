"""
Kiếm khí BĂNG TINH — bám theo ảnh mẫu người dùng gửi (kiếm khí trắng băng kiểu tranh anime).

  python3 -I tools/art/qi_sword_ice.py → tools/art/out/qi_sword_ice.png (RGBA 1024x320, mũi hướng phải)
                                          + tools/art/out/qi_sword_ice_preview.png (nền tối + nền sáng + cỡ trong trận)

Đặc điểm lấy từ mẫu:
  • thân bản rộng, thẳng; mũi vát chéo gọn; màu trắng băng, gần như trắng tinh
  • nét viền mảnh xanh lam nhạt, sắc (không viền đen); tô phẳng 2 tông: nửa trên trắng, nửa dưới xanh rất nhạt
  • đường sống giữa + 2 đường vát song song mép lưỡi, hội tụ ở mũi
  • khâu kiếm = gai tinh thể băng phân nhánh, lởm chởm, không đối xứng; chuôi ngắn quấn vạch; núm tinh thể
  • quầng sáng xanh rất nhẹ; vệt gió mảnh phía sau khi bay (chỉ trong ảnh xem trước)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
W, H = 1024, 320
SS = 2                                                   # dựng gấp đôi rồi thu nhỏ (nét mịn)
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


def seg(x0, y0, x1, y1, r):
    dx, dy = x1 - x0, y1 - y0
    L2 = dx * dx + dy * dy or 1
    t = np.clip(((X - x0) * dx + (Y - y0) * dy) / L2, 0, 1)
    return np.hypot(X - (x0 + dx * t), Y - (y0 + dy * t)) - r


def cov(d, soft=0.6):
    return np.clip(0.5 - d / soft, 0, 1)


def line(d, w=1.0):
    """nét mảnh dọc đường biên của d"""
    return cov(np.abs(d) - w / 2)


# ---------------------------------------------------------------- hình (bám ảnh mẫu tools/art/ref/qi_sword_ref.png)
GX = 300                       # khâu (tâm tia khí)
TIP = 992
S0, S1 = GX + 8, GX + 70       # đoạn gốc hẹp (thắt eo) rồi bậc vai lên thân chính
TB = 910                       # bắt đầu vát mũi
hw_root, hw_main, hw_end = 13, 21, 19
blade = poly([S0, CY - hw_root, S1, CY - hw_root, S1 + 16, CY - hw_main, TB, CY - hw_end, TIP, CY,
              TB, CY + hw_end, S1 + 16, CY + hw_main, S1, CY + hw_root, S0, CY + hw_root])
edge_band = np.clip(1 - np.clip(-blade, 0, None) / 3.2, 0, 1) * cov(blade)          # mép lưỡi sáng
# 2 rãnh song song dọc giữa thân
fuller = np.minimum(seg(S1 + 26, CY - 3, TB - 10, CY - 3, 0.45), seg(S1 + 26, CY + 3, TB - 10, CY + 3, 0.45))
# hoa văn khắc mảnh: vạch phù văn / vết nứt rải rác dọc thân (thưa dần về mũi)
rng = np.random.default_rng(17)
etch = np.full(X.shape, 1e9, np.float32)
x = S1 + 30
while x < TB - 30:
    k = rng.integers(0, 4)
    yo = rng.choice([-1, 1]) * rng.uniform(6, 13)
    if k == 0:
        etch = np.minimum(etch, seg(x, CY + yo, x + rng.uniform(10, 26), CY + yo + rng.uniform(-2, 2), 0.4))
    elif k == 1:
        etch = np.minimum(etch, np.minimum(seg(x, CY + yo, x + 6, CY + yo - 4, 0.4), seg(x + 6, CY + yo - 4, x + 14, CY + yo + 1, 0.4)))
    elif k == 2:
        etch = np.minimum(etch, seg(x, CY - 9, x + 4, CY + 9, 0.35))
    else:
        etch = np.minimum(etch, np.abs(np.hypot(X - x - 4, Y - CY - yo) - 2.2) - 0.35)
    x += rng.uniform(16, 44) * (1 + (x - S1) / 500)
ridge_hi = seg(S1 + 20, CY - 9, TIP - 70, CY - 7, 1.2)                            # dải sáng phản chiếu


def bolt(x0, y0, x1, y1, rough, depth, seed):
    r = np.random.default_rng(seed)
    pts = [np.array([x0, y0], float), np.array([x1, y1], float)]
    for _ in range(depth):
        n = [pts[0]]
        for a_, b_ in zip(pts[:-1], pts[1:]):
            e = b_ - a_
            L = np.hypot(*e)
            nrm = np.array([-e[1], e[0]]) / (L + 1e-6)
            n += [(a_ + b_) / 2 + nrm * r.normal() * L * rough, b_]
        pts = n
    return pts


# khâu = tia khí như sét / băng nứt phân nhánh tỏa ra từ chuôi (không đối xứng)
arcs = np.full(X.shape, 1e9, np.float32)
arcs_thin = np.full(X.shape, 1e9, np.float32)
# chủ yếu vuông góc lưỡi (thành chữ thập) + vài tia chạy dọc về sau / về trước
main_dirs = [(-86, 1.25, 1), (-98, 1.0, 2), (84, 1.2, 3), (96, 0.95, 4), (-160, 0.9, 5), (166, 0.8, 6), (-20, 0.75, 7), (24, 0.7, 8), (-130, 0.7, 9), (128, 0.65, 10)]
for ang_deg, L, sd in main_dirs:
    a_ = np.radians(ang_deg)
    ex, ey = GX + np.sin(a_) * 0 + np.cos(np.radians(90) - a_) * 0, CY
    tx, ty = GX + 110 * L * np.cos(a_), CY + 105 * L * np.sin(a_)
    pts = bolt(GX, CY, tx, ty, 0.14, 4, sd)
    for i in range(len(pts) - 1):
        t = i / (len(pts) - 1)
        arcs = np.minimum(arcs, seg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 3.0 * (1 - t) + 0.5))
    # nhánh phụ
    rr = np.random.default_rng(sd + 40)
    for _ in range(3):
        st = pts[rr.integers(len(pts) // 4, len(pts) * 3 // 4)]
        b2 = a_ + rr.choice([-1, 1]) * rr.uniform(0.4, 0.9)
        L2 = rr.uniform(22, 48)
        p2 = bolt(st[0], st[1], st[0] + np.cos(b2) * L2, st[1] + np.sin(b2) * L2, 0.18, 3, sd + 90)
        for i in range(len(p2) - 1):
            arcs_thin = np.minimum(arcs_thin, seg(p2[i][0], p2[i][1], p2[i + 1][0], p2[i + 1][1], 1.0))
guard_core = poly([GX - 8, CY - 12, GX + 10, CY - 15, GX + 10, CY + 15, GX - 8, CY + 12])
grip = poly([GX - 92, CY - 8, GX - 8, CY - 9, GX - 8, CY + 9, GX - 92, CY + 8])
wraps = np.minimum.reduce([seg(GX - 88 + i * 11, CY + 8, GX - 81 + i * 11, CY - 8, 0.45) for i in range(8)])
pommel = poly([GX - 116, CY, GX - 100, CY - 11, GX - 90, CY - 6, GX - 90, CY + 6, GX - 100, CY + 11])
# sợi khí dài từ chuôi, đầu mút là vòng bầu dục (như dây tua trong mẫu)
tassel_pts = bolt(GX - 116, CY, GX - 300, CY - 70, 0.04, 3, 77)
tassel = np.full(X.shape, 1e9, np.float32)
for i in range(len(tassel_pts) - 1):
    tassel = np.minimum(tassel, seg(tassel_pts[i][0], tassel_pts[i][1], tassel_pts[i + 1][0], tassel_pts[i + 1][1], 1.3))
lx, ly = GX - 312, CY - 76
loop = np.abs(np.hypot((X - lx) / 2.2, (Y - ly) / 1.0) - 7) - 1.3
hilt = np.minimum.reduce([guard_core, grip, pommel])
whole = np.minimum(blade, hilt)

# ---------------------------------------------------------------- tô màu: trắng trong suốt + viền xanh lam mảnh
WHITE = C('#ffffff')
ICE = C('#eef9ff')
ICE2 = C('#cfeaff')
EDGE = C('#5a90e0')          # viền ngoài (xanh lam như mẫu)
ETCH = C('#8fb8e8')          # hoa văn khắc
GLOW = C('#9fdcff')
ARC = C('#dff4ff')

rgb = np.zeros(X.shape + (3,), np.float32)
alpha = np.zeros(X.shape, np.float32)


def put(color, a):
    global rgb, alpha
    a = np.clip(a, 0, 1)[..., None]
    rgb = rgb * (1 - a) + color * a
    alpha[:] = alpha + (1 - alpha) * a[..., 0]


arc_mask = np.clip(cov(arcs) + cov(arcs_thin) * 0.7, 0, 1)
glow_src = np.clip(cov(whole) * 0.7 + arc_mask + cov(tassel) * 0.5 + cov(loop) * 0.6, 0, 1).astype(np.float32)
glow = ndimage.gaussian_filter(glow_src, 6 * SS) * 0.8 + ndimage.gaussian_filter(glow_src, 20 * SS) * 0.5
put(GLOW, np.clip(glow, 0, 1) * 0.7)
# thân: trắng băng TRONG SUỐT (alpha thấp ở lòng), mép lưỡi trắng đặc
upper = (Y < CY).astype(np.float32)[..., None]
put(WHITE * upper + ICE * (1 - upper), cov(blade) * 0.9)
put(ICE2, cov(blade) * np.clip((Y - CY) / 22, 0, 1) * 0.35)
put(WHITE, edge_band * 0.95)
put(WHITE, cov(ridge_hi) * cov(blade) * 0.55)
put(ETCH, line(fuller, 1.0) * cov(blade) * 0.8)
put(ETCH, line(etch, 0.9) * cov(blade) * 0.6)
# chuôi
put(ICE, cov(hilt) * 0.9)
put(ETCH, line(wraps, 1.0) * cov(grip))
# tia khí ở khâu: quầng xanh + lõi trắng
put(C('#7ac4ff'), np.clip(ndimage.gaussian_filter(arc_mask, 2.5 * SS) * 1.4, 0, 1) * 0.8)
put(ARC, arc_mask)
put(WHITE, cov(arcs + 1.2))
# dây tua + vòng
put(C('#9fd4ff'), cov(tassel) * 0.9)
put(WHITE, cov(tassel + 0.6) * 0.8)
put(EDGE, line(loop, 1.2))
put(ICE, cov(loop) * 0.8)
# viền xanh lam mảnh quanh thân + chuôi
put(EDGE, line(whole, 1.5))
# lấp lánh mũi
tx, ty = TIP - 6, CY
star = np.exp(-np.abs(Y - ty) / 1.2) * np.exp(-np.abs(X - tx) / 26) + np.exp(-np.abs(X - tx) / 1.2) * np.exp(-np.abs(Y - ty) / 18)
put(WHITE, np.clip(star, 0, 1) * 0.9)


def down(img):
    return np.asarray(Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8)).resize((W, H), Image.LANCZOS)).astype(np.float32) / 255


rgb_s = down(rgb)
a_s = down(np.repeat(alpha[..., None], 3, -1))[..., 0]
os.makedirs(OUT, exist_ok=True)
sword = Image.fromarray((np.dstack([rgb_s, a_s]) * 255).astype(np.uint8), 'RGBA')
sword.save(os.path.join(OUT, 'qi_sword_ice.png'))

# ---------------------------------------------------------------- ảnh xem trước: mẫu ↔ bản vẽ
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
except Exception:
    font = ImageFont.load_default()
ref = Image.open(os.path.join(HERE, 'ref', 'qi_sword_ref.png')).convert('RGB')
hero = Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA').crop((6 * 52, 0, 7 * 52, 68))
PW = 1180
sheet = Image.new('RGB', (PW, 360 * 3), (12, 11, 22))
# 1) so với mẫu: mẫu (kiếm bay góc trên + kiếm lớn) | bản vẽ xoay cùng góc trên nền trời sáng
sky = Image.new('RGBA', (PW, 360), (0, 0, 0, 255))
grad = np.linspace(0, 1, 360)[:, None, None] * (np.array([200, 235, 245]) - np.array([120, 190, 225])) + np.array([120, 190, 225])
sky = Image.fromarray(np.broadcast_to(grad, (360, PW, 3)).astype(np.uint8)).convert('RGBA')
sky.paste(ref.crop((0, 0, 300, 240)).resize((390, 312), Image.LANCZOS), (10, 40))
sky.paste(ref.crop((330, 220, 581, 470)).resize((300, 299), Image.LANCZOS), (410, 50))
ours = sword.resize((620, 194), Image.LANCZOS)
for ang, pos in [(-32, (720, 10)), (-14, (740, 150))]:
    r = ours.rotate(ang, expand=True, resample=Image.BICUBIC)
    sky.alpha_composite(r, pos)
d = ImageDraw.Draw(sky)
d.text((18, 8), 'Ảnh mẫu', fill=(20, 40, 80), font=font)
d.text((740, 8), 'Bản vẽ (cùng góc)', fill=(20, 40, 80), font=font)
sheet.paste(sky.convert('RGB'), (0, 0))
# 2) nền tối (trong trận) cỡ lớn + 3 thanh bay cạnh nhân vật
for j, (bgc, label, tc) in enumerate([((14, 13, 28), 'Nền tối (trong trận)', (255, 230, 160)), ((150, 205, 230), 'Nền sáng', (20, 40, 80))]):
    panel = Image.new('RGBA', (PW, 360), bgc + (255,))
    panel.alpha_composite(sword.resize((820, 256), Image.LANCZOS), (20, 60))
    tile = Image.new('RGBA', (300, 360), (26, 24, 40, 255) if j == 0 else (170, 215, 235, 255))
    for ox, oy, ang in [(0, 10, 28), (20, 110, 14), (0, 200, -8)]:
        tile.alpha_composite(sword.resize((250, 78), Image.LANCZOS).rotate(ang, expand=True, resample=Image.BICUBIC), (ox, oy))
    tile.alpha_composite(hero.resize((156, 204), Image.NEAREST), (150, 150))
    panel.alpha_composite(tile, (860, 0))
    ImageDraw.Draw(panel).text((24, 16), label, fill=tc, font=font)
    sheet.paste(panel.convert('RGB'), (0, 360 * (j + 1)))
sheet.save(os.path.join(OUT, 'qi_sword_ice_preview.png'))
print('ok')
