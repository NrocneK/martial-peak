"""
Chuyển mẫu ĐỘNG TÁC CHÉM (kiếm / đao) 8 hướng thành sprite nhân vật trong trận.

  python3 -I tools/art/trace_attack.py   → public/ui/hero_b_slash.png (8 hàng hướng × 2 cột: 0 = lấy đà, 1 = chém)
                                           + src/config/heroSlash.ts (điểm cầm + góc lưỡi trong mẫu, để gắn vũ khí đúng cấp)
                                           + tools/art/out/hero_b_slash_preview.png

Mẫu: tools/art/ref/hero_battle_slash_windup.png (lấy đà, kiếm giơ lên) và hero_battle_slash_strike.png (chém ra trước),
vẽ trên đúng khổ ảnh xuất 8 hướng (lưới 4x2: hàng 1 = S, SE, E, NE · hàng 2 = N, NW, W, SW; ô 444px, nhân vật phóng 3 lần,
góc trên-trái nhân vật tại (ô + 144, ô + 167)) rồi thu còn 1568 px ngang.
Các bước: lấy mẫu tâm từng điểm ảnh → bỏ nền → đưa màu về bảng màu gốc (nhân vật + kiếm mẫu) → tách điểm thuộc KIẾM
(màu chỉ có ở kiếm) → đo đường thẳng của kiếm: đầu gần thân = điểm cầm, hướng tới mũi = góc lưỡi → xóa kiếm + viền rời
→ vẽ lại viền. Trong game, kiếm / đao đúng loại + cấp được gắn lại ở điểm cầm, xoay theo góc lưỡi.
"""
import math
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
DIRS = ['s', 'sw', 'w', 'nw', 'n', 'ne', 'e', 'se']
ORDER = [['s', 'se', 'e', 'ne'], ['n', 'nw', 'w', 'sw']]
W, H = 52, 68
K = 1568 / 1776                       # mẫu là ảnh xuất 1776px thu còn 1568px
OUTLINE = (18, 14, 28)
POSES = [('windup', 'hero_battle_slash_windup.png'), ('strike', 'hero_battle_slash_strike.png')]
# Ô mà kiếm bị thân che gần hết trong mẫu: [điểm cầm x, y, góc lưỡi] ước theo phần còn lộ → vũ khí vẽ SAU thân
# Ô mà màu kiếm khó tách (trắng ngà lẫn áo): đặt tay [x, y, góc] rồi vẫn xóa dọc đường kiếm
FORCE = {('windup', 'se'): [36, 25, -90]}
HIDDEN = {('windup', 'e'): [25, 24, -112], ('windup', 'ne'): [21, 22, -128], ('strike', 'nw'): [30, 40, 58]}

hero_sheet = np.array(Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA'))
hero_cols = {tuple(int(v) for v in p[:3]) for p in hero_sheet.reshape(-1, 4) if p[3]}
sword = np.array(Image.open(os.path.join(ROOT, 'public', 'gear', 'wp_sword_b_4.png')).convert('RGBA'))
sword_cols = {tuple(int(v) for v in p[:3]) for p in sword.reshape(-1, 4) if p[3]} - hero_cols
HPAL = np.array(sorted(hero_cols))
BGS = np.array([(33, 58, 114), (22, 40, 80), (16, 28, 60)])


def sample(img, i, j, x, y, ox=0.0, oy=0.5):
    X = (i * 444 + 144 + (x + 0.5) * 3) * K + ox
    Y = (j * 444 + 167 + (y + 0.5) * 3) * K + oy
    return img[int(Y), int(X)]


def is_sword_raw(c):
    """Màu kiếm trong mẫu: vàng kim / vàng ngà / trắng ngà (đỏ ≈ lục, lam thấp hơn hẳn). Da người: đỏ cao hơn lục ~40 → loại."""
    r, g, b = (int(v) for v in c)
    light = r > 185 and g > 165 and r - g < 34 and g - b > 18
    dark = r > 120 and g > 90 and r - b > 60 and r - g < 38
    return light or dark


def largest(mask):
    from collections import deque
    seen = np.zeros_like(mask)
    best = []
    for y0, x0 in zip(*np.where(mask)):
        if seen[y0, x0]:
            continue
        q, comp = deque([(y0, x0)]), []
        seen[y0, x0] = True
        while q:
            y, x = q.popleft()
            comp.append((y, x))
            for yy in range(y - 1, y + 2):
                for xx in range(x - 1, x + 2):
                    if 0 <= yy < H and 0 <= xx < W and mask[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = True
                        q.append((yy, xx))
        if len(comp) > len(best):
            best = comp
    out = np.zeros_like(mask)
    for y, x in best:
        out[y, x] = True
    return out


def drop_islands(a_img, keep=6):
    m = a_img[:, :, 3] > 0
    from collections import deque
    seen = np.zeros_like(m)
    for y0, x0 in zip(*np.where(m)):
        if seen[y0, x0]:
            continue
        q, comp = deque([(y0, x0)]), []
        seen[y0, x0] = True
        while q:
            y, x = q.popleft(); comp.append((y, x))
            for yy in range(y - 1, y + 2):
                for xx in range(x - 1, x + 2):
                    if 0 <= yy < H and 0 <= xx < W and m[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = True; q.append((yy, xx))
        if len(comp) < keep:
            for y, x in comp:
                a_img[y, x] = 0
    return a_img


def outline(a_img):
    a_img = drop_islands(a_img)
    a = a_img[:, :, 3] > 0
    pad = np.pad(a, 1)
    nb = pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:]
    edge = nb & ~a
    a_img[edge, :3] = OUTLINE
    a_img[edge, 3] = 255
    return a_img


out_sheet = np.zeros((H * len(DIRS), W * 2, 4), np.uint8)
meta = {d: [] for d in DIRS}
for pi, (pose, fname) in enumerate(POSES):
    img = np.array(Image.open(os.path.join(HERE, 'ref', fname)).convert('RGB')).astype(int)
    for j, row in enumerate(ORDER):
        for i, d in enumerate(row):
            # căn lưới: dò độ lệch tốt nhất so với khung đứng ở vùng chân (hàng 57..64, không đổi giữa các tư thế)
            r = DIRS.index(d)
            ref = hero_sheet[r * H:(r + 1) * H, 6 * W:7 * W]
            best = None
            for ox in np.arange(-1.25, 1.3, 0.25):
                for oy in np.arange(-0.75, 1.8, 0.25):
                    err, n = 0, 0
                    for y in range(57, 65):
                        for x in range(6, 46):
                            if ref[y, x, 3]:
                                err += np.abs(sample(img, i, j, x, y, ox, oy) - ref[y, x, :3]).sum()
                                n += 1
                    if n and (best is None or err / n < best[0]):
                        best = (err / n, ox, oy)
            _, ox, oy = best
            spr = np.zeros((H, W, 4), np.uint8)
            swd = np.zeros((H, W), bool)
            for y in range(H):
                for x in range(W):
                    c = sample(img, i, j, x, y, ox, oy)
                    if np.min(np.abs(BGS - c).sum(1)) < 40:
                        continue
                    if is_sword_raw(c):
                        swd[y, x] = True
                    k = int(np.argmin(((HPAL - c) ** 2).sum(1)))
                    spr[y, x, :3] = HPAL[k]
                    spr[y, x, 3] = 255
            raw = swd.copy()
            swd = largest(swd)
            hidden = HIDDEN.get((pose, d))
            force = FORCE.get((pose, d))
            if not force and (hidden or swd.sum() < 12):
                gx, gy, ang = hidden or [26, 30, -100]
                meta[d].append([gx, gy, ang, 0])
                spr[swd] = 0
                spr = outline(spr)
                out_sheet[r * H:(r + 1) * H, pi * W:(pi + 1) * W] = spr
                continue
            if force:
                ang = force[2]
                dvec = np.array([math.cos(math.radians(ang)), math.sin(math.radians(ang))])
                grip = np.array(force[:2], float)
                hilt, tip = grip - dvec * 3, grip + dvec * 22
            else:
                ys, xs = np.where(swd)
                pts = np.c_[xs + 0.5, ys + 0.5]
                # đường thẳng của kiếm (PCA): hai đầu; đầu gần giữa thân (x 26, y 40) = đầu chuôi
                c0 = pts.mean(0)
                _, _, vt = np.linalg.svd(pts - c0)
                ax = vt[0]
                proj = (pts - c0) @ ax
                e1, e2 = c0 + ax * proj.min(), c0 + ax * proj.max()
                body = np.array([26, 40])
                hilt, tip = (e1, e2) if np.hypot(*(e1 - body)) < np.hypot(*(e2 - body)) else (e2, e1)
                dvec = (tip - hilt) / max(1e-6, np.hypot(*(tip - hilt)))
                grip = hilt + dvec * 3                                  # giữa chuôi = chỗ nắm tay
                ang = math.degrees(math.atan2(dvec[1], dvec[0]))
            # xóa mọi điểm sát đường kiếm (kể cả viền / phần sẫm); chỗ thủng giữa thân vá bằng màu điểm hai bên
            a0, a1 = hilt - dvec * 4, tip + dvec * 4
            seg = a1 - a0
            gone = np.zeros((H, W), bool)
            for y in range(H):
                for x in range(W):
                    p = np.array([x + 0.5, y + 0.5])
                    t = np.clip(((p - a0) @ seg) / (seg @ seg), 0, 1)
                    dl = np.hypot(*(p - (a0 + seg * t)))
                    if spr[y, x, 3] and (dl < 1.75 or (dl < 3.5 and raw[y, x])):
                        gone[y, x] = True
            before = spr.copy()
            spr[gone] = 0
            nvec = np.array([-dvec[1], dvec[0]])
            for y, x in zip(*np.where(gone)):
                for sgn in (1, -1):
                    hit = []
                    for k2 in range(2, 5):
                        xx, yy = int(round(x + nvec[0] * k2 * sgn)), int(round(y + nvec[1] * k2 * sgn))
                        if 0 <= xx < W and 0 <= yy < H and before[yy, xx, 3] and not gone[yy, xx]:
                            hit.append(before[yy, xx]); break
                    if not hit:
                        break
                else:
                    spr[y, x] = hit[0]
            spr = outline(spr)
            meta[d].append([round(float(grip[0]), 1), round(float(grip[1]), 1), round(ang, 1), 1])
            out_sheet[r * H:(r + 1) * H, pi * W:(pi + 1) * W] = spr

Image.fromarray(out_sheet, 'RGBA').save(os.path.join(ROOT, 'public', 'ui', 'hero_b_slash.png'))
lines = ['// TỰ SINH bởi tools/art/trace_attack.py — đừng sửa tay.',
         '// Động tác chém (kiếm / đao) trên hero_b_slash.png (khung 52x68): mỗi hướng [lấy đà, chém],',
         '// mỗi tư thế [điểm cầm x, y, góc lưỡi (độ; 0 = phải, 90 = xuống), số điểm kiếm trong mẫu].',
         'export const HERO_SLASH: Record<string, number[][]> = {']
for d in DIRS:
    lines.append(f'  {d}: {meta[d]},')
lines.append('};')
open(os.path.join(ROOT, 'src', 'config', 'heroSlash.ts'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
pv = Image.new('RGBA', (W * 2 * 4, H * len(DIRS) * 4), (36, 58, 112, 255))
pv.alpha_composite(Image.fromarray(out_sheet, 'RGBA').resize((W * 2 * 4, H * len(DIRS) * 4), Image.NEAREST))
pv.save(os.path.join(HERE, 'out', 'hero_b_slash_preview.png'))
for d in DIRS:
    print(d, meta[d])
