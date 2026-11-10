"""
Sheet DI CHUYỂN của nhân vật trong trận, dựng từ 8 hình đứng đã duyệt (tools/art/out/hero_b_base_*.png, do trace_battle.py tạo).

  python3 -I tools/art/walk_battle.py   → public/ui/hero_b_walk.png (8 hàng hướng × 7 cột, mỗi khung 52x68: 6 khung đi + cột cuối = đứng yên)
                                          + tools/art/out/hero_b_walk_preview.gif

Hàng (hướng): s, sw, w, nw, n, ne, e, se.  Chu kỳ 6 khung (đề xuất 10 khung/giây).
Cách dựng mỗi khung:
  - CHÂN: vùng dưới vạt áo (từ hàng LEG_Y) tách thành 2 chân (2 mảng liền lớn nhất, xếp theo x; chỉ có 1 mảng thì chia đôi).
    Chân A / B lệch pha nửa chu kỳ: sải dọc theo HƯỚNG ĐI trên màn hình (ngang: sải trước/sau; thẳng: tiến/lùi theo
    chiều dọc; chéo: cả hai) và NHẤC lên khi đang đưa về phía trước.
  - THÂN (trên LEG_Y): nhún lên 1 điểm ảnh lúc một chân đang đưa qua (giữa bước), vẽ đè lên chân (vạt áo che đùi).
  - TAY (vùng cẳng tay + bàn tay, khai báo tay trong PARTS): đánh NGƯỢC pha với chân cùng bên, lệch 1 điểm ảnh theo hướng đi.
  - ĐUÔI TÓC, DẢI ĐAI: lay ngang 2 lần mỗi chu kỳ (mỗi bước một lần), uốn dần từ gốc ra ngọn; dải đai trễ nhịp hơn tóc.
  - Viền ngoài 1px vẽ lại sau khi ghép.
"""
import math
import os
from collections import deque
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')
GIF = os.path.join(HERE, 'out', 'hero_b_walk_preview.gif')
DIRS = ['s', 'sw', 'w', 'nw', 'n', 'ne', 'e', 'se']
W, H, N = 52, 68, 6
OUTLINE = (18, 14, 28)
LEG_Y = {'s': 55, 'n': 55, 'se': 55, 'sw': 55, 'ne': 55, 'nw': 55, 'e': 56, 'w': 56}
# hướng đi trên màn hình (x phải, y xuống) và biên độ sải (điểm ảnh)
FWD = {'s': (0, 1), 'n': (0, -1), 'e': (1, 0), 'w': (-1, 0), 'se': (0.8, 0.45), 'sw': (-0.8, 0.45), 'ne': (0.8, -0.45), 'nw': (-0.8, -0.45)}
STRIDE = {'s': 1.5, 'n': 1.5, 'e': 3.2, 'w': 3.2, 'se': 2.6, 'sw': 2.6, 'ne': 2.6, 'nw': 2.6}
LIFT = 2
# Vùng cử động riêng trên từng hình (x0, y0, x1, y1 — x1/y1 không tính). arm: side 0 = tay bên trái màn hình
# (đánh cùng pha chân phải màn hình), 1 = tay bên phải. hair/sash: root = 'top' (gốc ở trên, ngọn rủ xuống) hoặc
# 'bottom' (gốc ở dưới — đuôi tóc vồng lên trên đầu khi nhìn thẳng). keep: không xóa chỗ cũ (vùng nằm giữa thân).
PARTS = {
    's': [('arm', (13, 34, 20, 43), 0), ('arm', (33, 34, 41, 43), 1), ('hair', (17, 0, 37, 10), 'bottom'),
          ('sash', (11, 43, 18, 52), 'top'), ('sash', (35, 43, 43, 52), 'top')],
    'se': [('arm', (15, 38, 23, 46), 0), ('arm', (28, 31, 37, 38), 1), ('hair', (8, 6, 20, 26), 'top'), ('sash', (5, 36, 15, 50), 'top')],
    'e': [('arm', (24, 38, 31, 46), 0), ('hair', (7, 9, 16, 27), 'top'), ('sash', (7, 34, 20, 50), 'top')],
    'ne': [('arm', (29, 37, 36, 45), 1), ('hair', (7, 15, 17, 36), 'top'), ('sash', (6, 38, 17, 50), 'top')],
    'n': [('arm', (13, 35, 20, 43), 0), ('arm', (33, 35, 40, 43), 1), ('hair', (18, 17, 36, 36), 'top', 'keep'), ('sash', (18, 36, 35, 50), 'top', 'keep')],
    'nw': [('arm', (16, 37, 23, 45), 0), ('hair', (32, 14, 46, 31), 'top'), ('sash', (34, 39, 47, 49), 'top')],
    'w': [('arm', (21, 38, 28, 46), 1), ('hair', (34, 9, 46, 28), 'top'), ('sash', (33, 35, 46, 50), 'top')],
    'sw': [('arm', (15, 32, 21, 38), 0), ('arm', (30, 39, 37, 46), 1), ('hair', (34, 6, 46, 24), 'top'), ('sash', (36, 36, 48, 49), 'top')],
}


def components(mask):
    h, w = mask.shape
    lab = np.zeros((h, w), int)
    comps = []
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not lab[y, x]:
                idx = len(comps) + 1
                q, pts = deque([(y, x)]), []
                lab[y, x] = idx
                while q:
                    cy, cx = q.popleft()
                    pts.append((cy, cx))
                    for yy, xx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                        if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]:
                            lab[yy, xx] = idx
                            q.append((yy, xx))
                comps.append(pts)
    return comps


def outline(img):
    a = img[:, :, 3] > 0
    pad = np.pad(a, 1)
    nb = pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:]
    edge = nb & ~a
    img[edge, :3] = OUTLINE
    img[edge, 3] = 255
    return img


def move_region(src, dst, box, off_fn, keep):
    """Dời các điểm ảnh trong box theo off_fn(y) → (dx, dy); keep = không xóa chỗ cũ"""
    x0, y0, x1, y1 = box
    blk = src[y0:y1, x0:x1].copy()
    if not keep:
        dst[y0:y1, x0:x1][blk[:, :, 3] > 0] = 0
    for yy in range(y1 - y0):
        dx, dy = off_fn(y0 + yy)
        for xx in range(x1 - x0):
            if blk[yy, xx, 3] == 0:
                continue
            ty, tx = y0 + yy + dy, x0 + xx + dx
            if 0 <= ty < H and 0 <= tx < W:
                dst[ty, tx] = blk[yy, xx]


def animate_parts(upper, d, t, fx, fy):
    out = upper.copy()
    for part in PARTS.get(d, []):
        kind, box = part[0], part[1]
        keep = 'keep' in part[3:]
        if kind == 'arm':
            ph = t + math.pi if part[2] == 0 else t          # ngược pha chân cùng bên
            sw = math.sin(ph) * 1.2
            dx, dy = round(fx * sw), round(fy * sw)
            if dx or dy:
                move_region(upper, out, box, lambda y, dx=dx, dy=dy: (dx, dy), keep)
        else:
            lag = 0.9 if kind == 'hair' else 1.8
            amp = 1.4 if kind == 'hair' else 1.8
            sway = math.sin(2 * t - lag) * amp
            x0, y0, x1, y1 = box
            if part[2] == 'top':
                f = lambda y, sway=sway, y0=y0, y1=y1: (round(sway * max(0, y - y0) / max(1, y1 - 1 - y0)), 0)
            else:
                f = lambda y, sway=sway, y0=y0, y1=y1: (round(sway * max(0, y1 - 1 - y) / max(1, y1 - 1 - y0)), 0)
            move_region(out.copy(), out, box, f, keep)
    return out


sheet = np.zeros((H * len(DIRS), W * (N + 1), 4), np.uint8)
frames_by_dir = {}
for r, d in enumerate(DIRS):
    base = np.array(Image.open(os.path.join(HERE, 'out', f'hero_b_base_{d}.png')).convert('RGBA'))
    ly = LEG_Y[d]
    a = base[:, :, 3] > 0
    legmask = a.copy()
    legmask[:ly] = False
    comps = sorted(components(legmask), key=len, reverse=True)
    legs = [c for c in comps[:2] if len(c) >= 6]
    if len(legs) == 1:                                     # một mảng: chia đôi theo x
        xs = sorted(x for _, x in legs[0])
        mid = xs[len(xs) // 2]
        legs = [[p for p in legs[0] if p[1] < mid], [p for p in legs[0] if p[1] >= mid]]
    legs.sort(key=lambda c: sum(x for _, x in c) / len(c))
    rest = [p for c in comps[2:] for p in c]               # mảnh vụn dưới vạt: đi theo thân
    upper = base.copy()
    upper[ly:] = 0
    for y, x in rest:
        upper[y, x] = base[y, x]
    fx, fy = FWD[d]
    frames = []
    for f in range(N):
        t = 2 * math.pi * f / N
        img = np.zeros((H, W, 4), np.uint8)
        for i, leg in enumerate(legs):
            ph = t if i == 0 else t + math.pi
            fwd = math.sin(ph) * STRIDE[d]
            lift = max(0.0, math.cos(ph)) * LIFT
            dx, dy = round(fx * fwd), round(fy * fwd - lift)
            for y, x in leg:
                yy, xx = y + dy, x + dx
                if 0 <= yy < H and 0 <= xx < W:
                    img[yy, xx] = base[y, x]
        bob = -1 if abs(math.cos(t)) > 0.7 else 0          # giữa bước: thân nhô lên 1 điểm ảnh
        up = animate_parts(upper, d, t, fx, fy)
        ua = up[:, :, 3] > 0
        ys, xs = np.where(ua)
        ok = (ys + bob >= 0) & (ys + bob < H)
        img[ys[ok] + bob, xs[ok]] = up[ys[ok], xs[ok]]
        img = outline(img)
        sheet[r * H:(r + 1) * H, f * W:(f + 1) * W] = img
        frames.append(img)
    sheet[r * H:(r + 1) * H, N * W:(N + 1) * W] = outline(base.copy())   # cột đứng yên
    frames_by_dir[d] = frames

Image.fromarray(sheet, 'RGBA').save(OUT)

# ---- xem trước: 8 hướng xếp la bàn, phóng 3 lần, nền xanh + bóng
S = 3
lay = [['nw', 'n', 'ne'], ['w', None, 'e'], ['sw', 's', 'se']]
gif = []
for f in range(N):
    pv = Image.new('RGBA', (3 * (W * S + 12), 3 * (H * S + 12)), (36, 58, 112, 255))
    from PIL import ImageDraw
    dr = ImageDraw.Draw(pv)
    for rr, row in enumerate(lay):
        for cc, d in enumerate(row):
            if not d:
                continue
            ox, oy = cc * (W * S + 12) + 6, rr * (H * S + 12) + 6
            dr.ellipse([ox + 16 * S, oy + 61.5 * S, ox + 36 * S, oy + 66.5 * S], fill=(16, 28, 60, 255))
            pv.alpha_composite(Image.fromarray(frames_by_dir[d][f], 'RGBA').resize((W * S, H * S), Image.NEAREST), (ox, oy))
    gif.append(pv.convert('RGB'))
gif[0].save(GIF, save_all=True, append_images=gif[1:], duration=100, loop=0)
print('→', OUT, '·', GIF)
