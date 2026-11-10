"""
Chuyển mẫu ĐỘNG TÁC KÉO CUNG 8 hướng thành sprite nhân vật trong trận (giữ nguyên cây cung + dây + mũi tên trong mẫu).

  python3 -I tools/art/trace_bow.py   → public/ui/hero_b_draw.png (8 hàng hướng × 12 cột: cấp cung 0..5 × [kéo căng, buông dây])
                                        + tools/art/out/hero_b_draw_preview.png

Mẫu: tools/art/ref/hero_battle_bow_draw.png (dây kéo căng, tên đặt trên dây), hero_battle_bow_release.png (dây đã buông),
vẽ trên ảnh xuất 8 hướng (1776px; lưới 4x2: hàng 1 = S, SE, E, NE · hàng 2 = N, NW, W, SW; ô 444px; nhân vật phóng 3 lần,
góc trên-trái nhân vật tại (ô + 144, ô + 167)).
Khung 84x72 lớn hơn khung nhân vật 52x68 (cung + tên vươn ra ngoài): nhân vật nằm ở (16, 4) trong khung.
Màu cung trong mẫu (vàng) được tô lại theo màu gỗ của từng cấp cung → 6 bộ khung.
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
DIRS = ['s', 'sw', 'w', 'nw', 'n', 'ne', 'e', 'se']
ORDER = [['s', 'se', 'e', 'ne'], ['n', 'nw', 'w', 'sw']]
W, H = 52, 68                 # khung nhân vật
FW, FH, OX, OY = 84, 72, 16, 4  # khung kéo cung + vị trí khung nhân vật bên trong
OUTLINE = (18, 14, 28)
POSES = ['hero_battle_bow_draw.png', 'hero_battle_bow_release.png']
RAINBOW = [(255, 90, 90), (255, 170, 60), (255, 232, 100), (95, 240, 160), (90, 184, 255), (168, 122, 255), (255, 122, 224)]
# màu cánh cung theo cấp: [tối, chính, sáng] (bám bảng màu gỗ / viền kim loại trong gear.px.js)
BOW_COL = [
    [(106, 68, 40), (148, 98, 56), (176, 122, 72)],
    [(58, 122, 64), (106, 168, 88), (143, 208, 122)],
    [(46, 62, 116), (74, 98, 168), (184, 208, 255)],
    [(200, 64, 42), (255, 176, 74), (255, 208, 106)],
    [(232, 180, 64), (255, 242, 176), (255, 255, 255)],
    [(58, 46, 110), (106, 88, 192), None],
]

hero_sheet = np.array(Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA'))
HPAL = np.array(sorted({tuple(int(v) for v in p[:3]) for p in hero_sheet.reshape(-1, 4) if p[3]}))
BGS = np.array([(33, 58, 114), (22, 40, 80), (16, 28, 60)])


def sample(img, i, j, x, y, ox, oy):
    """x, y: toạ độ trong khung nhân vật 52x68 (có thể âm / vượt khung)"""
    X = int(i * 444 + 144 + (x + 0.5) * 3 + ox)
    Y = int(j * 444 + 167 + (y + 0.5) * 3 + oy)
    if not (j * 444 <= Y < (j + 1) * 444 and i * 444 <= X < (i + 1) * 444):
        return None
    return img[Y, X]


def bow_shade(c):
    """0/1/2 = tối/chính/sáng nếu là màu cánh cung (vàng) trong mẫu, ngược lại None. Da người: lục - lam nhỏ → loại."""
    r, g, b = (int(v) for v in c)
    if r > 150 and g > 120 and r - b > 60 and g - b > 40 and r - g < 50:
        lum = 0.3 * r + 0.59 * g + 0.11 * b
        return 2 if lum > 222 else 1 if lum > 190 else 0
    return None


def outline(a):
    m = a[:, :, 3] > 0
    pad = np.pad(m, 1)
    nb = pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:]
    e = nb & ~m
    a[e, :3] = OUTLINE
    a[e, 3] = 255
    return a


sheet = np.zeros((FH * 8, FW * 12, 4), np.uint8)
for pi, fname in enumerate(POSES):
    img = np.array(Image.open(os.path.join(HERE, 'ref', fname)).convert('RGB')).astype(int)
    for j, row in enumerate(ORDER):
        for i, d in enumerate(row):
            r = DIRS.index(d)
            ref = hero_sheet[r * H:(r + 1) * H, 6 * W:7 * W]
            best = None
            for ox in range(-1, 2):           # căn lưới theo vùng chân (giống khung đứng)
                for oy in range(-1, 2):
                    err = n = 0
                    for y in range(57, 65):
                        for x in range(6, 46):
                            if ref[y, x, 3]:
                                err += np.abs(sample(img, i, j, x, y, ox, oy) - ref[y, x, :3]).sum(); n += 1
                    if best is None or err / n < best[0]:
                        best = (err / n, ox, oy)
            _, ox, oy = best
            base = np.zeros((FH, FW, 4), np.uint8)
            shade = np.full((FH, FW), -1)
            for fy in range(FH):
                for fx in range(FW):
                    c = sample(img, i, j, fx - OX, fy - OY, ox, oy)
                    if c is None or np.min(np.abs(BGS - c).sum(1)) < 40:
                        continue
                    s = bow_shade(c)
                    if s is not None:
                        shade[fy, fx] = s
                    k = int(np.argmin(((HPAL - c) ** 2).sum(1)))
                    if s is None and np.abs(HPAL[k] - c).sum() > 120:   # dây / tên trắng ngà ngoài bảng màu
                        base[fy, fx, :3] = c
                    else:
                        base[fy, fx, :3] = HPAL[k]
                    base[fy, fx, 3] = 255
            # điểm lẻ (không có láng giềng 4 hướng) = nhiễu
            m = base[:, :, 3] > 0
            pad = np.pad(m, 1)
            lone = m & ~(pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:])
            base[lone] = 0
            for t in range(6):
                spr = base.copy()
                for fy, fx in zip(*np.where(shade >= 0)):
                    s = shade[fy, fx]
                    col = BOW_COL[t][s] if BOW_COL[t][s] else RAINBOW[(fy // 2) % 7]
                    spr[fy, fx, :3] = col
                spr = outline(spr)
                c0 = (t * 2 + pi) * FW
                sheet[r * FH:(r + 1) * FH, c0:c0 + FW] = spr

Image.fromarray(sheet, 'RGBA').save(os.path.join(ROOT, 'public', 'ui', 'hero_b_draw.png'))
pv = Image.new('RGBA', (sheet.shape[1] * 3, sheet.shape[0] * 3), (36, 58, 112, 255))
pv.alpha_composite(Image.fromarray(sheet, 'RGBA').resize((sheet.shape[1] * 3, sheet.shape[0] * 3), Image.NEAREST))
pv.save(os.path.join(HERE, 'out', 'hero_b_draw_preview.png'))
print('ok')
