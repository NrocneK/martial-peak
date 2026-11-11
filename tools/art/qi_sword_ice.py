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


# ---------------------------------------------------------------- hình
GX = 330                       # khâu kiếm
TIP = 985
B0 = GX + 6
TB = 895                       # bắt đầu vát mũi
hw0, hw1 = 28, 25              # nửa bề rộng gốc / chỗ bắt đầu vát
blade = poly([B0, CY - hw0, TB, CY - hw1, TIP, CY, TB, CY + hw1, B0, CY + hw0])
# đường vát song song mép (cách mép 8px), hội tụ ở mũi; đường sống giữa
bev_up = [(B0 + 4, CY - hw0 + 8), (TB, CY - hw1 + 8), (TIP - 22, CY)]
bev_dn = [(B0 + 4, CY + hw0 - 8), (TB, CY + hw1 - 8), (TIP - 22, CY)]
bevel_lines = np.minimum.reduce([seg(*bev_up[0], *bev_up[1], 0.5), seg(*bev_up[1], *bev_up[2], 0.5),
                                 seg(*bev_dn[0], *bev_dn[1], 0.5), seg(*bev_dn[1], *bev_dn[2], 0.5)])
ridge = seg(B0 + 10, CY, TIP - 30, CY, 0.6)
# vùng vát (giữa mép và đường vát) — tô sáng hơn ở nửa trên
bevel_up = poly([B0, CY - hw0, TB, CY - hw1, TIP, CY, TIP - 22, CY, TB, CY - hw1 + 8, B0 + 4, CY - hw0 + 8])
bevel_dn = poly([B0, CY + hw0, TB, CY + hw1, TIP, CY, TIP - 22, CY, TB, CY + hw1 - 8, B0 + 4, CY + hw0 - 8])

# khâu: gai tinh thể băng phân nhánh, không đối xứng
shards = [
    [GX + 8, CY - 20, GX + 30, CY - 58, GX + 16, CY - 50, GX + 24, CY - 88, GX + 4, CY - 60, GX - 12, CY - 74, GX - 6, CY - 26],
    [GX + 26, CY - 58, GX + 46, CY - 70, GX + 30, CY - 52],                        # nhánh phụ trên
    [GX + 8, CY + 20, GX + 34, CY + 52, GX + 18, CY + 46, GX + 18, CY + 76, GX + 2, CY + 54, GX - 16, CY + 62, GX - 6, CY + 24],
    [GX - 10, CY + 56, GX - 30, CY + 70, GX - 14, CY + 50],                        # nhánh phụ dưới
    [GX - 6, CY - 26, GX + 12, CY - 22, GX + 12, CY + 22, GX - 6, CY + 26, GX - 14, CY],   # lõi khâu
]
guard = np.minimum.reduce([poly(s) for s in shards])
guard_inner = np.minimum.reduce([seg(GX + 2, CY - 24, GX + 16, CY - 70, 0.5), seg(GX + 2, CY + 24, GX + 12, CY + 62, 0.5)])
grip = poly([GX - 100, CY - 9, GX - 12, CY - 10, GX - 12, CY + 10, GX - 100, CY + 9])
wraps = np.minimum.reduce([seg(GX - 96 + i * 12, CY + 9, GX - 88 + i * 12, CY - 9, 0.5) for i in range(7)])
pommel = poly([GX - 132, CY, GX - 108, CY - 14, GX - 98, CY - 6, GX - 98, CY + 6, GX - 108, CY + 14])
pommel_spike = np.minimum(poly([GX - 128, CY - 4, GX - 146, CY - 18, GX - 122, CY - 9]), poly([GX - 128, CY + 4, GX - 150, CY + 14, GX - 122, CY + 9]))
hilt = np.minimum.reduce([guard, grip, pommel, pommel_spike])
whole = np.minimum(blade, hilt)

# ---------------------------------------------------------------- tô màu (kiểu tranh: phẳng 2 tông + nét viền xanh nhạt)
WHITE = C('#ffffff')
ICE = C('#e4f6ff')           # tông trắng băng
ICE2 = C('#bfe6ff')          # tông khuất
EDGE = C('#6ab8f0')          # nét viền
EDGE2 = C('#9fd4ff')         # nét trong (đường vát, sống)
GLOW = C('#9fdcff')

rgb = np.zeros(X.shape + (3,), np.float32)
alpha = np.zeros(X.shape, np.float32)


def put(color, a):
    global rgb, alpha
    a = np.clip(a, 0, 1)[..., None]
    rgb = rgb * (1 - a) + color * a
    alpha[:] = alpha + (1 - alpha) * a[..., 0]


# quầng sáng rất nhẹ quanh toàn thanh (xuất riêng để game tự cộng; ở đây gộp vào alpha thấp)
glow = ndimage.gaussian_filter(cov(whole).astype(np.float32), 9 * SS) * 0.7 + ndimage.gaussian_filter(cov(whole).astype(np.float32), 24 * SS) * 0.5
put(GLOW, np.clip(glow, 0, 1) * 0.6)
# thân: nửa trên trắng, nửa dưới băng nhạt; phần vát trên trắng tinh, vát dưới xanh nhạt hơn
upper = (Y < CY).astype(np.float32)
put(ICE * upper[..., None] + ICE2 * (1 - upper[..., None]), cov(blade) * 0.92)
put(WHITE, cov(bevel_up) * 0.95)
put(C('#d2eeff'), cov(bevel_dn) * 0.9)
# chuyển tông nhẹ về mép dưới (đỡ phẳng)
put(C('#a8d8f8'), cov(blade) * np.clip((Y - CY) / 28, 0, 1) * 0.35)
# ánh sáng chạy dọc thân (dải trắng mảnh lệch trên sống)
put(WHITE, cov(seg(B0 + 30, CY - 4, TIP - 60, CY - 3, 1.6)) * cov(blade) * 0.8)
# chuôi + khâu + núm
put(ICE, cov(hilt) * 0.95)
put(WHITE, cov(guard) * ((Y < CY) * 0.6 + 0.2))
put(EDGE2, line(wraps, 1.2) * cov(grip))
# nét trong
put(EDGE2, line(bevel_lines, 1.1) * cov(blade))
put(EDGE, line(ridge, 1.2) * cov(blade))
put(EDGE2, line(guard_inner, 1.0))
# nét viền ngoài
put(EDGE, line(whole, 1.6))
# lấp lánh mũi kiếm
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

# ---------------------------------------------------------------- ảnh xem trước
def streaks(w, h, seed, color):
    """vệt gió mảnh phía sau thanh kiếm đang bay"""
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    rng = np.random.default_rng(seed)
    for _ in range(9):
        y = int(h / 2 + rng.normal(0, h * 0.12))
        x1 = int(rng.uniform(0, w * 0.25))
        x2 = int(x1 + rng.uniform(w * 0.15, w * 0.35))
        n = 12
        for k in range(n):
            xa, xb = x1 + (x2 - x1) * k / n, x1 + (x2 - x1) * (k + 1) / n
            d.line([(xa, y), (xb, y)], fill=color + (int(rng.uniform(110, 190) * (k + 1) / n),), width=int(rng.uniform(2, 3)))
    from PIL import ImageFilter
    return im.filter(ImageFilter.GaussianBlur(0.8))


try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
except Exception:
    font = ImageFont.load_default()
hero = Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA').crop((6 * 52, 0, 7 * 52, 68))
PW, PH = 1180, 380
sheet = Image.new('RGB', (PW, PH * 2), (12, 11, 22))
for j, (bgc, label, tc) in enumerate([((14, 13, 28), 'Băng Tinh Kiếm Khí · nền tối (trong trận)', (255, 230, 160)),
                                       ((150, 205, 230), 'Băng Tinh Kiếm Khí · nền sáng (giống ảnh mẫu)', (20, 40, 80))]):
    panel = Image.new('RGBA', (PW, PH), bgc + (255,))
    big = sword.resize((820, 256), Image.LANCZOS)
    panel.alpha_composite(streaks(820, 256, 3 + j, (200, 235, 255) if j == 0 else (245, 252, 255)), (20, 70))
    panel.alpha_composite(big, (20, 70))
    # cỡ trong trận: 3 thanh bay chéo + nhân vật (phóng 3 lần)
    tile = Image.new('RGBA', (300, PH), (26, 24, 40, 255) if j == 0 else (170, 215, 235, 255))
    for k, (ox, oy, ang) in enumerate([(-10, 20, 28), (30, 120, 14), (-30, 200, -8)]):
        sm = sword.resize((240, 75), Image.LANCZOS).rotate(ang, expand=True, resample=Image.BICUBIC)
        tile.alpha_composite(sm, (max(0, ox), oy))
    hz = hero.resize((52 * 3, 68 * 3), Image.NEAREST)
    tile.alpha_composite(hz, (150, 150))
    panel.alpha_composite(tile, (860, 0))
    d = ImageDraw.Draw(panel)
    d.text((24, 18), label, fill=tc, font=font)
    sheet.paste(panel.convert('RGB'), (0, j * PH))
sheet.save(os.path.join(OUT, 'qi_sword_ice_preview.png'))
print('ok')
