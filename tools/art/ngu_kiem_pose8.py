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

FIST_R = ['.222.', '2bbY2', '2bYV2', '2YVS2']          # nắm tay nhìn từ bên phải (sáng bên trái)
FIST_L = ['.222.', '2Ybb2', '2VYb2', '2SVY2']          # lật cho hướng nhìn sang trái


def at(x, y, rows):
    return [(y + j, x, r) for j, r in enumerate(rows)]


def diag(x, y, n, dx, s='21B92'):
    """cẳng tay chéo: mỗi hàng dời dx điểm"""
    return [(y + j, x + j * dx, s) for j in range(n)]


POSE = {
    # ---- S: tay trái bên phải người xem; bắp tay áo (phồng) giữ ở vai
    ('s', 1): at(29, 27, FIST_R) + diag(29, 31, 4, 1) + [(35, 33, '222')],
    ('s', 2): at(32, 29, ['.2222.', '2bbbY2', '2bbYV2', '2YYVS2', '2VSS82']) + [(34, 31, '21B99B12'), (35, 32, '222222')],
    # ---- SW: tay trái gần, bên phải người xem
    ('sw', 1): at(26, 27, FIST_R) + diag(26, 31, 5, 1) + [(36, 31, '222')],
    ('sw', 2): [(31, 30, '21B9'), (32, 30, '1B99'), (33, 30, '21B9')]
               + at(24, 30, ['.2222.', '2bbbY2', '2bbYV2', '2YYVS2', '2VSS82', '.2222.']),
    # ---- W: nhìn sang trái, tay trái gần
    ('w', 1): at(13, 26, FIST_L) + diag(13, 30, 7, 1, '29B12') + [(37, 20, '222')],
    ('w', 2): [(27, 9, '2222222222222'), (28, 8, '2B99991deeedc2'), (29, 8, '2B99991ddccZU2'),
               (30, 8, '22222222cZZUU2'), (31, 15, '2ZUUU2'), (32, 16, '2222')]
              + at(3, 26, ['.2222.', '2Ybbb2', '2VYbb2', '2VVYb2', '2SVVY2', '.2222.']),
    # ---- NW: lưng chéo, tay trái gần bên trái người xem
    ('nw', 1): [(35, 16, '2192'), (36, 16, '2B92'), (37, 17, '22')],
    ('nw', 2): [(27, 7, '22222222222222'), (28, 6, '2B999991dddcZZ2'), (29, 6, '2B999991dccZZU2'),
                (30, 6, '222222222ZZUUU2'), (31, 15, '2UUU2'), (32, 16, '222')]
               + at(2, 26, ['.222.', '2Ybb2', '2VYb2', '2SVY2', '.222.']),
    # ---- N: lưng — tay đưa ra trước bị thân che, chỉ thấy khuỷu khi gập tay
    ('n', 1): [(35, 14, '2192'), (36, 15, '222')],
    ('n', 2): [],
    # ---- NE: tay trái khuất hẳn sau thân và đầu ở cả hai tư thế → giữ nguyên khung gốc
    ('ne', 1): [],
    ('ne', 2): [],
    # ---- E: tay trái phía xa — chỉ phần ló ra trước ngực
    ('e', 1): at(37, 22, FIST_R) + diag(37, 26, 2, 0) + diag(36, 28, 2, 0) + [(30, 35, '21B92'), (31, 35, '2B92')],
    ('e', 2): [(27, 36, '2222222'), (28, 35, '2dcZB999'), (29, 35, '2cZUB999'), (30, 35, '2ZUU2222'),
               (31, 36, '2UU2'), (32, 37, '22')]
              + at(43, 26, ['.2222.', '2bbbY2', '2bbYV2', '2YYVS2', '2VSS82', '.2222.']),
    # ---- SE: tay trái phía xa, bên phải người xem
    ('se', 1): at(33, 22, FIST_R) + diag(33, 26, 2, 0) + diag(34, 28, 2, 0) + [(30, 35, '2B92'), (31, 35, '222')],
    ('se', 2): [(27, 35, '222222'), (28, 34, '2dcZB999'), (29, 34, '2cZUB999'), (30, 34, '2ZUU2222'),
                (31, 35, '2UU2'), (32, 36, '22')]
               + at(42, 26, ['.2222.', '2bbbY2', '2bbYV2', '2YYVS2', '2VSS82', '.2222.']),
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
