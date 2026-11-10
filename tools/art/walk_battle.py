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
        ua = upper[:, :, 3] > 0
        ys, xs = np.where(ua)
        ok = (ys + bob >= 0) & (ys + bob < H)
        img[ys[ok] + bob, xs[ok]] = upper[ys[ok], xs[ok]]
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
