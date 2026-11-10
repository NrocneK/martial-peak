"""
Chuyển ảnh mẫu 8 hướng của nhân vật trong trận (tools/art/ref/hero_battle_ref.webp, lưới 4x2 ô)
thành sprite pixel art cùng cỡ, cùng mặt đất, cùng bảng màu.

  python3 -I tools/art/trace_battle.py       → tư thế thường: public/ui/hero_b_*.png + tools/art/out/hero_b_base_*.png
  python3 -I tools/art/trace_battle.py fan   → tư thế CẦM QUẠT (tay phải trước ngực, mẫu hero_battle_fan_ref.webp):
                                               tools/art/out/hero_bf_base_*.png (+ public/ui/hero_bf_*.png, ảnh xem trước)
  (hero_*_base_*.png chưa viền = đầu vào của walk_battle.py)

Thứ tự ô trong ảnh mẫu thường: hàng 1 = S, SE, E, NE · hàng 2 = N, NW, W, SW.
Mẫu cầm quạt: hàng 1 = NW, N, NE, E · hàng 2 = SE, S, SW, W.
Các bước: tách nền xanh + bóng dưới chân (loang từ mép ô, viền tối của nhân vật chặn vùng loang)
→ căn chân về cùng một điểm → thu nhỏ theo khối F x F (màu trung vị của phần thuộc nhân vật)
→ gom 8 hướng về CHUNG một bảng màu → xóa điểm lẻ → viền ngoài 1px.
"""
import os
import sys
from collections import deque
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VARIANT = sys.argv[1] if len(sys.argv) > 1 else ''
if VARIANT == 'fan':
    SRC = os.path.join(HERE, 'ref', 'hero_battle_fan_ref.webp')
    ORDER = [['nw', 'n', 'ne', 'e'], ['se', 's', 'sw', 'w']]
    PFX = 'hero_bf'
else:
    SRC = os.path.join(HERE, 'ref', 'hero_battle_ref.webp')
    ORDER = [['s', 'se', 'e', 'ne'], ['n', 'nw', 'w', 'sw']]
    PFX = 'hero_b'
OUT_DIR = os.path.join(ROOT, 'public', 'ui')
PREVIEW = os.path.join(HERE, 'out', f'{PFX}_preview.png')

F = 6                    # 6 điểm ảnh mẫu → 1 điểm ảnh sprite
W, H = 52, 68            # khung sprite
FOOT = (26, 64)          # điểm giữa hai chân trên sprite (x, hàng mặt đất)
N_COLORS = 40
OUTLINE = (18, 14, 28)

src = np.array(Image.open(SRC).convert('RGB')).astype(int)
SH, SW = src.shape[:2]


def is_bg(p):
    r, g, b = p
    return b - r > 36 and r < 48 and g < 80          # nền xanh + bóng xanh sẫm (tóc / quần ít xanh hơn nhiều)


def cell_mask(c):
    h, w, _ = c.shape
    bg = np.zeros((h, w), bool)
    q = deque([(y, x) for x in range(w) for y in (0, h - 1)] + [(y, x) for y in range(h) for x in (0, w - 1)])
    while q:
        y, x = q.popleft()
        if 0 <= y < h and 0 <= x < w and not bg[y, x] and is_bg(c[y, x]):
            bg[y, x] = True
            q.extend([(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)])
    # khe nền bị bao kín (giữa hai chân, giữa tay và thân): mảng nền >= 30 điểm cũng là nền
    seen = bg.copy()
    for y0 in range(h):
        for x0 in range(w):
            if seen[y0, x0] or not is_bg(c[y0, x0]):
                continue
            comp, q = [], deque([(y0, x0)])
            seen[y0, x0] = True
            while q:
                y, x = q.popleft()
                comp.append((y, x))
                for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                    if 0 <= yy < h and 0 <= xx < w and not seen[yy, xx] and is_bg(c[yy, xx]):
                        seen[yy, xx] = True
                        q.append((yy, xx))
            if len(comp) >= 30:
                for y, x in comp:
                    bg[y, x] = True
    return ~bg


cells = {}
for j, row in enumerate(ORDER):
    for i, name in enumerate(row):
        x0, x1 = round(i * SW / 4) + 5, round((i + 1) * SW / 4) - 5
        y0, y1 = round(j * SH / 2) + 5, round((j + 1) * SH / 2) - 5
        c = src[y0:y1, x0:x1]
        m = cell_mask(c)
        ys, xs = np.where(m)
        bottom = ys.max()
        feet = xs[ys > bottom - (bottom - ys.min()) * 0.12]        # 12% dưới cùng = ủng
        cx = (feet.min() + feet.max()) / 2
        cells[name] = (c, m, bottom, cx)

# ---- bảng màu chung (k-means trên điểm ảnh nhân vật của cả 8 ô, khởi tạo kiểu k-means++)
#      gom màu NGAY TRÊN ẢNH MẪU trước khi thu nhỏ → giữ được mảng nhỏ quan trọng (da, ủng nâu, khóa đai)
rng = np.random.default_rng(1)
allpx = np.concatenate([c[m] for c, m, _, _ in cells.values()]).astype(float)
px = allpx[rng.choice(len(allpx), min(len(allpx), 40000), replace=False)]
cent = [px[rng.integers(len(px))]]
for _ in range(N_COLORS - 1):
    d = np.min(((px[:, None, :] - np.array(cent)[None]) ** 2).sum(2), 1)
    cent.append(px[np.argmax(d)] if len(cent) < 14 else px[rng.choice(len(px), p=d / d.sum())])
cent = np.array(cent)
for _ in range(20):
    lab = np.argmin(((px[:, None, :] - cent[None]) ** 2).sum(2), 1)
    for k in range(N_COLORS):
        if (lab == k).any():
            cent[k] = px[lab == k].mean(0)
lum = cent @ np.array([0.3, 0.59, 0.11])
DARK = lum < 42                                   # màu nét viền / bóng sâu


def labels(c):
    flat = c.reshape(-1, 3).astype(float)
    out = np.empty(len(flat), int)
    for i in range(0, len(flat), 20000):
        out[i:i + 20000] = np.argmin(((flat[i:i + 20000, None, :] - cent[None]) ** 2).sum(2), 1)
    return out.reshape(c.shape[:2])


# ---- thu nhỏ: mỗi điểm sprite = khối F x F của mẫu, căn chân về FOOT; lấy màu XUẤT HIỆN NHIỀU NHẤT trong khối,
#      riêng nét tối chiếm >= 30% khối thì ưu tiên giữ nét (để không mất viền / mắt / lọn tóc)
small = {}
for name, (c, m, bottom, cx) in cells.items():
    L = labels(c)
    out = np.zeros((H, W, 4), np.uint8)
    for oy in range(H):
        for ox in range(W):
            sy = int(round(bottom - (FOOT[1] - oy) * F - F / 2))
            sx = int(round(cx + (ox - FOOT[0]) * F - F / 2))
            ys, xs = slice(max(0, sy), max(0, sy + F)), slice(max(0, sx), max(0, sx + F))
            blk_m = m[ys, xs]
            if blk_m.size == 0 or blk_m.mean() < 0.5:
                continue
            lb = L[ys, xs][blk_m]
            cnt = np.bincount(lb, minlength=N_COLORS)
            dk = cnt * DARK
            k = int(np.argmax(dk)) if dk.sum() >= 0.3 * len(lb) else int(np.argmax(cnt))
            out[oy, ox, :3] = cent[k].round()
            out[oy, ox, 3] = 255
    small[name] = out
names = [n for row in ORDER for n in row]

os.makedirs(os.path.dirname(PREVIEW), exist_ok=True)
for k, name in enumerate(names):
    rgb = small[name][:, :, :3]
    a = small[name][:, :, 3] > 0
    # xóa điểm lẻ (không có láng giềng 4 hướng nào)
    for y in range(H):
        for x in range(W):
            if a[y, x] and not any(0 <= y + dy < H and 0 <= x + dx < W and a[y + dy, x + dx] for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                a[y, x] = False
    img = np.zeros((H, W, 4), np.uint8)
    img[a, :3] = rgb[a]
    img[a, 3] = 255
    Image.fromarray(img, 'RGBA').save(os.path.join(HERE, 'out', f'{PFX}_base_{name}.png'))   # chưa viền: walk_battle.py cắt ghép
    # viền ngoài 1px
    edge = np.zeros_like(a)
    for y in range(H):
        for x in range(W):
            if not a[y, x] and any(0 <= y + dy < H and 0 <= x + dx < W and a[y + dy, x + dx] for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                edge[y, x] = True
    img[edge, :3] = OUTLINE
    img[edge, 3] = 255
    Image.fromarray(img, 'RGBA').save(os.path.join(OUT_DIR, f'{PFX}_{name}.png'))
    small[name] = img

# ---- ảnh xem trước: lưới la bàn, phóng to 4 lần, có bóng dưới chân
S = 4
lay = [['nw', 'n', 'ne'], ['w', None, 'e'], ['sw', 's', 'se']]
pv = Image.new('RGBA', (3 * (W * S + 16), 3 * (H * S + 16)), (36, 58, 112, 255))
for r, row in enumerate(lay):
    for c_, name in enumerate(row):
        if not name:
            continue
        ox, oy = c_ * (W * S + 16) + 8, r * (H * S + 16) + 8
        sh = Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0))
        from PIL import ImageDraw
        ImageDraw.Draw(sh).ellipse([(FOOT[0] - 10) * S, (FOOT[1] - 2.5) * S, (FOOT[0] + 10) * S, (FOOT[1] + 2.5) * S], fill=(16, 28, 60, 255))
        pv.alpha_composite(sh, (ox, oy))
        pv.alpha_composite(Image.fromarray(small[name], 'RGBA').resize((W * S, H * S), Image.NEAREST), (ox, oy))
pv.save(PREVIEW)
print('→', OUT_DIR, f'{PFX}_*.png ·', PREVIEW)
