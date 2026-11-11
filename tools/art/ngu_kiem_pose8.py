"""
Tư thế thi triển NGỰ KIẾM, 8 hướng, khung 52x68 — tay phải giữ dáng đứng gốc, chỉ tay trái cử động:
  khung 1: đưa tay trái lên trước ngực      khung 2: duỗi thẳng tay trái ra trước
Bàn tay vẽ đơn giản (nắm gọn như bàn tay gốc của sprite), tay áo trắng + cổ tay xanh đậm.

  python3 -I tools/art/ngu_kiem_pose8.py → public/ui/hero_cast_ngukiem.png (hàng = s,sw,w,nw,n,ne,e,se; cột = khung 1, 2)
                                           + tools/art/out/ngu_kiem_pose8_preview.png
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
DIRS = ['s', 'sw', 'w', 'nw', 'n', 'ne', 'e', 'se']
W, H = 52, 68

PAL = {
    'o': (18, 14, 28, 255),
    'a': (245, 205, 180, 255), 'b': (221, 178, 153, 255), 'c': (193, 151, 129, 255), 'd': (165, 127, 107, 255),
    'w': (242, 240, 246, 255), 'x': (223, 221, 228, 255), 'y': (197, 197, 211, 255), 'z': (156, 158, 177, 255),
    'u': (79, 100, 151, 255), 'v': (59, 73, 118, 255), 'n': (38, 39, 61, 255),
    'r': (53, 65, 105, 255), 'R': (32, 33, 50, 255),
}

FIST = """
.oooo.
oaabbo
oabbco
oabcco
obccdo
.oooo.
"""

ART = {
    # ---- E: nhìn ngang sang phải
    ('e', 1): [(34, 25, """
..onnvo.
..owxyo.
.owxxyo.
.owxyyo.
owxyyzo.
oxyyzzo.
oyyzzo..
.oooo...
"""), (35, 20, FIST)],
    ('e', 2): [(30, 23, """
.oooooooooooo
owwxxxyuuuuuo
owxxxyyvvvvvo
oxyyyzznnnnno
oxyyzzzoooooo
.oyzzzzo.....
..ozzzzo.....
...oooo......
"""), (42, 22, FIST)],
    # ---- S: nhìn thẳng (tay trái ở bên phải người xem)
    ('s', 1): [(31, 25, """
.onnvo...
.owxyo...
.owxyyo..
.oxyyzzo.
..oyzzzo.
...oooo..
"""), (31, 20, FIST)],
    ('s', 2): [(29, 26, """
.oooooo.
ounnnvo.
owxxyyo.
owxyyzzo
.oyzzzo.
..ooo...
"""), (30, 21, FIST)],
    # ---- N: lưng quay về người xem (tay trái ở bên trái người xem), bàn tay bị thân che
    ('n', 1): [(11, 27, """
..ooo.
.owxyo
owxyzo
owyzzo
.ozzo.
..oo..
""")],
    ('n', 2): [(11, 25, """
..oooo
.owxxy
owxyyz
.ozzzo
..oo..
""")],
    # ---- NE: tay giơ lên thấy khuỷu áo bên trái; duỗi ra trước thấy nắm tay ló cạnh đầu
    ('ne', 1): [(8, 27, """
..ooo.
.owxyo
owxyzo
owyzzo
.ozzo.
..oo..
""")],
    ('ne', 2): [(33, 20, """
.ooo..
oaabo.
oabco.
obcdo.
onnvo.
nnvo..
""")],
}

# bàn tay trái đang buông trong khung gốc (xóa trước khi vẽ tay mới): hướng → (vùng, màu vá)
ERASE = {'s': ((33, 36, 39, 42), (53, 65, 105, 255)), 'se': ((31, 37, 40, 46), (197, 197, 211, 255)),
         'n': ((12, 37, 19, 42), (32, 33, 50, 255))}


def frame(d):
    sh = Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA')
    r = DIRS.index(d)
    return sh.crop((6 * W, r * H, 7 * W, r * H + H))


def rows(im, x0, y0, art):
    px = im.load()
    for j, line in enumerate(art.strip('\n').split('\n')):
        for i, ch in enumerate(line):
            x, y = x0 + i, y0 + j
            if ch != '.' and 0 <= x < W and 0 <= y < H:
                px[x, y] = PAL[ch]


def erase(im, d):
    if d not in ERASE:
        return
    (x0, y0, x1, y1), fill = ERASE[d]
    px = im.load()
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            r, g, b, a = px[x, y]
            if a and r > 150 and r - b > 40:      # điểm màu da
                px[x, y] = fill


def draw(d, n, base_dir=None, dx=0):
    im = frame(d)
    erase(im, d)
    for x, y, art in ART[(base_dir or d, n)]:
        rows(im, x + dx, y, art)
    return im


def overlay(d, n, dx=0):
    """chỉ lớp tay (để lật gương sang hướng đối xứng)"""
    o = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for x, y, art in ART[(d, n)]:
        rows(o, x + dx, y, art)
    return o


def mirror_onto(dst, ov, shift):
    ov = ov.transpose(Image.FLIP_LEFT_RIGHT)
    ov = ov.transform(ov.size, Image.AFFINE, (1, 0, -shift, 0, 1, 0))
    dst.alpha_composite(ov)
    return dst


def build():
    out = {}
    for n in (1, 2):
        out[('e', n)] = draw('e', n)
        out[('s', n)] = draw('s', n)
        out[('n', n)] = draw('n', n)
        out[('ne', n)] = draw('ne', n)
        out[('se', n)] = draw('se', n, 'e', dx=-2)                            # chéo xuống phải: dùng dáng của E
        out[('w', n)] = mirror_onto(frame('w'), overlay('e', n), 1)
        sw = frame('sw')
        px = sw.load()
        for y in range(37, 47):                                               # xóa tay trái buông (lật của SE)
            for x in range(11, 21):
                r, g, b, a = px[x, y]
                if a and r > 150 and r - b > 40:
                    px[x, y] = PAL['y']
        out[('sw', n)] = mirror_onto(sw, overlay('e', n, -2), 1)
        out[('nw', n)] = mirror_onto(frame('nw'), overlay('ne', n), 0)
    sheet = Image.new('RGBA', (W * 2, H * 8), (0, 0, 0, 0))
    for r, d in enumerate(DIRS):
        for n in (1, 2):
            sheet.alpha_composite(out[(d, n)], (W * (n - 1), H * r))
    return sheet


def main():
    os.makedirs(OUT, exist_ok=True)
    sheet = build()
    sheet.save(os.path.join(ROOT, 'public', 'ui', 'hero_cast_ngukiem.png'))
    Z = 4
    pv = Image.new('RGBA', (8 * (W * Z + 6) + 6, 3 * (H * Z + 4) + 6), (28, 52, 112, 255))
    for i, d in enumerate(DIRS):
        x = 6 + i * (W * Z + 6)
        pv.alpha_composite(frame(d).resize((W * Z, H * Z), Image.NEAREST), (x, 6))
        for n in (1, 2):
            pv.alpha_composite(sheet.crop((W * (n - 1), H * i, W * n, H * i + H)).resize((W * Z, H * Z), Image.NEAREST), (x, 6 + n * (H * Z + 4)))
    pv.save(os.path.join(OUT, 'ngu_kiem_pose8_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
