"""
Chuyển ảnh concept nhân vật (tools/art/ref/hero_concept.png) thành sprite pixel art cho pxl.

  python3 -I tools/art/trace_hero.py        → ghi tools/art/hero_trace.px.js (lưới màu + bảng màu)

Các bước: tách nền (loang màu từ mép ảnh, viền đen của nhân vật chặn vùng loang) → bỏ bóng dưới chân
→ thu nhỏ theo trung bình vùng (cao TARGET_H px) → gom màu (k-means) → xóa điểm lẻ + viền mờ sáng.
hero.px.js dùng lưới này làm khung gốc rồi thêm hoạt ảnh (thở, tóc, dải đai bay).
"""
import os
from collections import deque, Counter
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'ref', 'hero_concept.png')
OUT = os.path.join(HERE, 'hero_trace.px.js')
TARGET_H = 104
N_COLORS = 40
SMALL_H = 36        # sprite đi bộ trong trận
SMALL_COLORS = 24
CROP = (62, 352, 14, 186)          # y0, y1, x0, x1: bỏ tiêu đề, khung và mép ảnh
BG = np.array([240, 230, 222])     # màu giấy nền
KEYS = 'abcdefghijlmnopqrstuvwxyzABCDEFGHIJLMNOPQRSTUVWXYZ0123456789'  # bỏ 'k' (viền) và các ký tự đặc biệt

a = np.array(Image.open(SRC).convert('RGB')).astype(int)
y0, y1, x0, x1 = CROP
a = a[y0:y1, x0:x1]
h, w, _ = a.shape

# --- 1. tách nền: loang từ mép, dừng ở pixel khác màu giấy
def is_bg(p):
    return np.abs(p - BG).sum() < 62
bgm = np.zeros((h, w), bool)
q = deque([(y, x) for x in range(w) for y in (0, h - 1)] + [(y, x) for y in range(h) for x in (0, w - 1)])
while q:
    y, x = q.popleft()
    if 0 <= y < h and 0 <= x < w and not bgm[y, x] and is_bg(a[y, x]):
        bgm[y, x] = True
        q.extend([(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)])

# --- 2. bóng dưới chân: màu xám nhạt, ít bão hòa, nằm ở 1/8 dưới cùng → coi là nền
sat = a.max(2) - a.min(2)
bright = a.mean(2)
shadow = (sat < 40) & (bright > 150) & (np.arange(h)[:, None] > h * 0.86)
bgm |= shadow
# loang lần 2 từ mọi điểm nền (kể cả bóng): bắt các mảng giấy bị kẹt giữa hai chân
q = deque(zip(*np.where(bgm)))
seen = bgm.copy()
while q:
    y, x = q.popleft()
    for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
        if 0 <= yy < h and 0 <= xx < w and not seen[yy, xx] and (is_bg(a[yy, xx]) or shadow[yy, xx]):
            seen[yy, xx] = True
            q.append((yy, xx))
bgm = seen

ys, xs = np.where(~bgm)
by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
rgba = np.dstack([a, (~bgm) * 255])[by0:by1, bx0:bx1].astype(float)

def trace(target_h, n_colors):
    """Thu nhỏ ảnh đã tách nền về cao target_h px, gom n_colors màu. Trả (bảng màu, các hàng lưới)."""
    # --- 3. thu nhỏ theo trung bình vùng (nhân trước alpha để mép không lem màu nền)
    r = target_h / rgba.shape[0]
    tw = round(rgba.shape[1] * r)
    pm = rgba.copy(); pm[..., :3] *= pm[..., 3:4] / 255
    small = np.array(Image.fromarray(pm.astype(np.uint8), 'RGBA').resize((tw, target_h), Image.BOX)).astype(float)
    al = small[..., 3]
    solid = al > 120
    rgb = np.where(solid[..., None], small[..., :3] * 255 / np.maximum(al[..., None], 1), 0)

    # --- 4. gom màu: k-means trên các pixel đặc
    pts = rgb[solid]
    rng = np.random.default_rng(3)
    cent = pts[rng.choice(len(pts), n_colors, replace=False)]
    for _ in range(40):
        d = ((pts[:, None, :] - cent[None]) ** 2).sum(2)
        lab = d.argmin(1)
        for k in range(n_colors):
            if (lab == k).any():
                cent[k] = pts[lab == k].mean(0)
    # Màu nhỏ nhưng quan trọng (khóa đai vàng) dễ bị k-means gộp mất → giữ thành một màu riêng
    gold = (pts[:, 0] > 150) & (pts[:, 1] > 115) & (pts[:, 2] < 110) & (pts[:, 0] - pts[:, 2] > 70)
    if gold.sum() >= 2:
        cent[np.argmin(((cent - pts[gold].mean(0)) ** 2).sum(1))] = pts[gold].mean(0)
    d = ((rgb[..., None, :] - cent[None, None]) ** 2).sum(3)
    idx = np.where(solid, d.argmin(2), -1)

    # --- 5. dọn viền: pixel ở mép bóng có màu gần màu giấy nền (lem từ ảnh gốc) → bỏ; pxl tự vẽ viền tối.
    #        KHÔNG lọc điểm lẻ: mắt, khóa đai, viền hoa văn chỉ rộng 1px.
    H2, W2 = idx.shape
    lum = cent.mean(1)
    for _ in range(2):
        drop = []
        for y in range(H2):
            for x in range(W2):
                if idx[y, x] < 0:
                    continue
                edge = any(not (0 <= yy < H2 and 0 <= xx < W2) or idx[yy, xx] < 0
                           for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)))
                if not edge:
                    continue
                col = cent[idx[y, x]]
                n4 = sum(1 for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)) if 0 <= yy < H2 and 0 <= xx < W2 and idx[yy, xx] >= 0)
                grey_fringe = n4 <= 2 and col.mean() > 105 and col.max() - col.min() < 45
                if np.abs(col - BG).sum() < 75 or grey_fringe:
                    drop.append((y, x))
        for y, x in drop:
            idx[y, x] = -1

    # vệt bóng còn sót dưới đế ủng: 2 hàng cuối, màu xám nhạt
    for y in range(H2 - 2, H2):
        for x in range(W2):
            if idx[y, x] >= 0:
                col = cent[idx[y, x]]
                if col.mean() > 120 and col.max() - col.min() < 40:
                    idx[y, x] = -1
    order = np.argsort(cent.mean(1))
    remap = {int(o): i for i, o in enumerate(order)}
    pal = {KEYS[remap[k]]: '#%02x%02x%02x' % tuple(int(v) for v in np.clip(cent[k], 0, 255)) for k in range(n_colors)}
    rows = [''.join('.' if v < 0 else KEYS[remap[int(v)]] for v in row) for row in idx]
    return pal, rows



def hexrgb(c):
    return np.array([int(c[i:i + 2], 16) for i in (1, 3, 5)])


def to_palette(pal_src, rows, pal_dst):
    """Đổi lưới sang bảng màu khác: mỗi màu → màu gần nhất trong pal_dst (dùng chung một bảng màu)."""
    keys = list(pal_dst)
    cols = np.array([hexrgb(pal_dst[k]) for k in keys])
    m = {k: keys[int(((cols - hexrgb(c)) ** 2).sum(1).argmin())] for k, c in pal_src.items()}
    return [''.join(m.get(ch, ch) for ch in row) for row in rows]


big = trace(TARGET_H, N_COLORS)
small = trace(SMALL_H, SMALL_COLORS)
with open(OUT, 'w', encoding='utf-8') as f:
    f.write('// TỰ SINH bởi tools/art/trace_hero.py từ tools/art/ref/hero_concept.png — đừng sửa tay, chạy lại script.\n')
    f.write(f'// HERO: {len(big[1][0])}x{len(big[1])} ({N_COLORS} màu) · HERO_S (trong trận): {len(small[1][0])}x{len(small[1])} ({SMALL_COLORS} màu)\n')
    # globalThis: để hero.px.js đọc được sau include()
    f.write('globalThis.HERO_PAL = ' + repr(big[0]).replace("'", '"') + '\n')
    f.write('globalThis.HERO_GRID = `\n' + '\n'.join(big[1]) + '`\n')
    f.write('globalThis.HERO_S_GRID = `\n' + '\n'.join(to_palette(small[0], small[1], big[0])) + '`\n')
print('xong →', OUT)
