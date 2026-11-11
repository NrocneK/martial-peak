"""
Tư thế thi triển NGỰ KIẾM, 8 hướng, khung 52x68 — vẽ lại tay trái theo từng điểm ảnh (tay phải giữ nguyên).
  khung 1: đưa tay trái lên trước ngực      khung 2: duỗi thẳng tay trái ra trước

Mỗi hướng: (1) XÓA cẳng tay + bàn tay trái đang buông của khung gốc và vẽ lại phần thân/vạt áo bị nó che,
           (2) VẼ cẳng tay + bàn tay trái ở tư thế mới. Tay trái ở hướng E, NE nằm khuất sau thân nên chỉ vẽ thêm phần lộ ra.
Bên của tay trái theo hướng nhìn: S, SW → bên phải người xem;  W, NW, N → bên trái người xem;  SE, E, NE → phía xa.

Lưới chữ dùng đúng bảng màu của sprite (tools/art/hero_palette.json): ' ' = giữ điểm cũ, '.' = trong suốt.
  2 viền · 1 9 B 7 cẳng tay áo tối · b Y V S 8 da sáng → tối · e d c Z U X a tay áo / vạt trắng · E F H K M N áo xanh

  python3 -I tools/art/ngu_kiem_pose8.py → public/ui/hero_cast_ngukiem.png (hàng = s,sw,w,nw,n,ne,e,se; cột = khung 1, 2)
                                           + tools/art/out/ngu_kiem_pose8_preview.png
"""
import json
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
DIRS = ['s', 'sw', 'w', 'nw', 'n', 'ne', 'e', 'se']
W, H = 52, 68
PAL = {k: tuple(v) for k, v in json.load(open(os.path.join(HERE, 'hero_palette.json'))).items()}

# ------------------------------------------------------------------ XÓA tay trái buông + vá thân
ERASE = {
    's': [(34, 33, '2.......'), (35, 33, '2.......'), (36, 33, '2.......'), (37, 33, '2.......'),
          (38, 34, '2......'), (39, 34, '2......'), (40, 34, '2......'), (41, 36, '2...'), (42, 36, '2...')],
    'sw': [(37, 29, 'EFHH02....'), (38, 29, 'EFHH02.....'), (39, 29, 'EFHH02......'), (40, 30, 'EFHHF02.....'),
           (41, 30, 'HcZZU02.'), (42, 30, 'HcdZU02.'), (43, 30, 'HcdZXU02.'), (44, 30, 'HcddZXRT')],
    'w': [(37, 21, 'EFFHHKH00'), (38, 23, 'EFHHKH00'), (39, 23, 'FHHKKH0'), (40, 23, 'FHHKH02'),
          (41, 22, 'KHXZZU0'), (42, 22, 'MXcZZU0'), (43, 22, 'UXcdZU0'), (44, 22, 'ZcddZX'), (45, 22, 'XcddZXU')],
    'nw': [(36, 17, '.2KHHKHK'), (37, 17, '...2KHKH'), (38, 20, '2HKKHHKH'), (39, 17, '..2HKKHHE'),
           (40, 17, '..2HKKHE'), (41, 16, '..2UKKHH7'), (42, 17, '.2UKKHH7'), (43, 17, '20UKKHO')],
    'n': [(35, 13, '......2'), (36, 13, '......2'), (37, 13, '......2'), (38, 13, '......2'),
          (39, 13, '.....2'), (40, 13, '.....2'), (41, 14, '....2')],
    'se': [(32, 33, '02..'), (33, 33, '02..'), (34, 33, '02..'), (35, 33, '02..'), (36, 33, '02..'), (37, 33, '02..')],
}

# ---------------------------------------------------------------- vẽ cánh tay theo khung xương
# Kích thước lấy từ ảnh mẫu (ref/ngu_kiem_s_ref.webp, ngu_kiem_se_ref.webp) thu về cỡ sprite:
# bàn tay cao ~7 điểm, bắp tay áo trắng dày ~5 điểm, cẳng tay áo xanh dày ~4 điểm.
import math

HAND_R = ['.222..', '2bbY2.', '2bbY22', '2bbbY2', '2YbbV2', '2SVVS2', '.2222.']   # bàn tay dựng, nhìn từ phải
HAND_L = [r[::-1] for r in HAND_R]
HAND_F = ['.2222..', '2bbbY2.', '2bbbY22', '2bbbbY2', '2YbbbV2', '2SYVVS2', '.22222.']  # lòng bàn tay hướng người xem
SLEEVE = ['e', 'd', 'c', 'Z', 'U']      # tay áo trắng: sáng (trên) → tối (dưới)
FORE = ['N', 'M', 'K', 'H']             # cẳng tay áo xanh
CUFF = ['9', 'B', '1']


def _dist(px, py, a, b):
    (ax, ay), (bx, by) = a, b
    dx, dy = bx - ax, by - ay
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy or 1)))
    cx, cy = ax + t * dx, ay + t * dy
    return math.hypot(px - cx, py - cy), py - cy


def arm(segs, hand=None):
    """segs: [(điểm đầu, điểm cuối, bán kính, bảng màu)]; hand: (x, y, mẫu) — trả về danh sách điểm vẽ"""
    fill, edge = {}, set()
    for a, b, r, cols in segs:
        x0, x1 = int(min(a[0], b[0]) - r - 2), int(max(a[0], b[0]) + r + 2)
        y0, y1 = int(min(a[1], b[1]) - r - 2), int(max(a[1], b[1]) + r + 2)
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                d, off = _dist(x + 0.5, y + 0.5, (a[0] + 0.5, a[1] + 0.5), (b[0] + 0.5, b[1] + 0.5))
                if d <= r:
                    k = (off + r) / (2 * r)                 # 0 = mép trên (sáng) … 1 = mép dưới (tối)
                    fill[(x, y)] = cols[min(len(cols) - 1, int(k * len(cols)))]
                elif d <= r + 1:
                    edge.add((x, y))
    items = [(y, x, '2') for (x, y) in edge if (x, y) not in fill]
    items += [(y, x, c) for (x, y), c in fill.items()]
    if hand:
        hx, hy, rows = hand
        items += [(hy + j, hx, r.replace('.', ' ')) for j, r in enumerate(rows)]
    return items


def bent(elbow, wrist, hand):
    """cánh tay gập: bắp tay áo (phồng) giữ ở vai, cẳng tay từ khuỷu lên cổ tay"""
    return arm([(elbow, wrist, 1.6, FORE)], hand)


def straight(shoulder, elbow, wrist, hand):
    """cánh tay duỗi thẳng: bắp tay áo trắng → cẳng tay áo xanh → bàn tay"""
    return arm([(shoulder, elbow, 2.2, SLEEVE), (elbow, wrist, 1.6, FORE)], hand)


POSE = {
    # ---- S: tay trái bên phải người xem (theo mẫu: bàn tay dựng trước ngực, khuỷu ra ngoài)
    ('s', 1): bent((37, 34), (33, 30), (29, 23, HAND_R)),
    ('s', 2): arm([((36, 33), (35, 33), 2.2, FORE)], (32, 27, HAND_F)),
    # ---- SW: tay trái gần, bên phải người xem
    ('sw', 1): bent((34, 36), (30, 31), (26, 24, HAND_R)),
    ('sw', 2): arm([((32, 34), (29, 34), 2.0, FORE)], (23, 29, HAND_F)),
    # ---- W: nhìn sang trái, tay trái gần
    ('w', 1): bent((23, 36), (18, 31), (13, 24, HAND_L)),
    ('w', 2): straight((25, 30), (17, 30), (10, 30), (3, 24, HAND_L)),
    # ---- NW: lưng chéo — gập tay thì cẳng tay khuất trước ngực, chỉ thấy khuỷu; duỗi thì cả cánh tay lộ ra
    ('nw', 1): arm([((20, 36), (17, 33), 1.6, FORE)]),
    ('nw', 2): straight((21, 31), (14, 29), (8, 27), (2, 21, HAND_L)),
    # ---- N: lưng — tay đưa ra trước bị thân che, chỉ thấy khuỷu khi gập tay
    ('n', 1): arm([((16, 35), (15, 33), 1.6, FORE)]),
    ('n', 2): [],
    # ---- NE: tay trái khuất hẳn sau thân và đầu ở cả hai tư thế → giữ nguyên khung gốc
    ('ne', 1): [],
    ('ne', 2): [],
    # ---- E: tay trái phía xa — phần ló ra trước ngực
    ('e', 1): bent((37, 32), (38, 28), (36, 20, HAND_R)),
    ('e', 2): straight((34, 28), (40, 28), (45, 28), (44, 22, HAND_R)),
    # ---- SE: tay trái phía xa, bên phải người xem (theo mẫu)
    ('se', 1): bent((35, 32), (36, 28), (33, 20, HAND_R)),
    ('se', 2): straight((31, 28), (38, 28), (44, 27), (44, 21, HAND_R)),
}


def frame(d):
    sh = Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA')
    r = DIRS.index(d)
    return sh.crop((6 * W, r * H, 7 * W, r * H + H))


def paint(im, items):
    px = im.load()
    for y, x0, s in items:
        for i, ch in enumerate(s):
            x = x0 + i
            if ch == ' ' or not (0 <= x < W and 0 <= y < H):
                continue
            px[x, y] = (0, 0, 0, 0) if ch == '.' else PAL[ch]


def pose(d, n):
    im = frame(d)
    paint(im, ERASE.get(d, []))
    paint(im, POSE[(d, n)])
    return im


def main():
    os.makedirs(OUT, exist_ok=True)
    sheet = Image.new('RGBA', (W * 2, H * 8), (0, 0, 0, 0))
    for r, d in enumerate(DIRS):
        for n in (1, 2):
            sheet.alpha_composite(pose(d, n), (W * (n - 1), H * r))
    sheet.save(os.path.join(ROOT, 'public', 'ui', 'hero_cast_ngukiem.png'))
    Z = 5
    pv = Image.new('RGBA', (4 * 3 * (W * Z + 4) + 40, 2 * (H * Z + 8) + 8), (28, 52, 112, 255))
    for i, d in enumerate(DIRS):
        bx = 8 + (i % 4) * (3 * (W * Z + 4) + 8)
        by = 6 + (i // 4) * (H * Z + 8)
        pv.alpha_composite(frame(d).resize((W * Z, H * Z), Image.NEAREST), (bx, by))
        for n in (1, 2):
            pv.alpha_composite(sheet.crop((W * (n - 1), H * i, W * n, H * i + H)).resize((W * Z, H * Z), Image.NEAREST), (bx + n * (W * Z + 4), by))
    pv.save(os.path.join(OUT, 'ngu_kiem_pose8_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
