"""
NGỰ KIẾM — hướng S (nhìn thẳng): giữ NGUYÊN thân + tay cầm kiếm (tay phải, bên trái người xem) của khung đứng gốc.
Tay TRÁI (bên phải người xem) theo ảnh mẫu S (trace/ngu_kiem_trace_s.png, chép bằng trace_ref.py).
Ảnh mẫu lớn hơn sprite ~7% nên chỉ lấy phần tay, căn theo mặt (giữa mặt mẫu x33 / cằm y26 ↔ sprite x26 / y22).

  1) xóa cẳng tay + bàn tay trái buông (x33-40 / y34-42), viền lại đáy tay áo + mép thân
  2) khung 1 (đưa tay lên trước ngực): bàn tay = điểm da (+ viền sát da) của mẫu; cẳng tay áo tối nối xuống khuỷu
     ở đáy bắp tay áo (bắp tay giữ nguyên ở vai)
  3) khung 2 (duỗi thẳng về phía người xem): cẳng tay chĩa thẳng vào người xem nên chỉ thấy miệng ống tay áo
     (vòng trắng, lòng tối) sau bàn tay; bàn tay gần người xem nên to hơn, lòng bàn tay hướng ra trước

  python3 -I tools/art/ngu_kiem_s.py → tools/art/out/ngu_kiem_s.png (2 khung) + ngu_kiem_s_preview.png
"""
import os
import sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import ngu_kiem_nw as NW  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
W, H = 52, 68
PAL = NW.PAL
NONE = (0, 0, 0, 0)
DX, DY = -7, -4

ERASE = [(34, 33, '2222222'), (35, 33, '2.......'), (36, 33, '2.......'), (37, 33, '2.......'),
         (38, 35, '......'), (39, 35, '......'), (40, 35, '......'), (41, 36, '...'), (42, 36, '...')]


def frame_s():
    sh = Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA')
    return sh.crop((6 * W, 0, 7 * W, H))


def paint(im, items):
    px = im.load()
    for y, x0, row in items:
        for i, ch in enumerate(row):
            if ch != ' ':
                px[x0 + i, y] = NONE if ch == '.' else PAL[ch]


def is_skin(c):
    return c[3] and c[0] > 150 and c[0] - c[2] > 30


def pose(n):
    im = frame_s()
    paint(im, ERASE)
    px = im.load()
    if n == 1:
        tr = Image.open(os.path.join(HERE, 'trace', 'ngu_kiem_trace_s.png')).convert('RGBA')
        tp = tr.load()
        NW.limb(im, [((30, 31), (36, 34), 1.6, NW.FORE)])      # cẳng tay: cổ tay → khuỷu dưới bắp tay áo
        for y in range(26, 37):
            for x in range(31, 40):
                c = tp[x, y]
                near = any(is_skin(tp[x + a, y + b]) for a in (-1, 0, 1) for b in (-1, 0, 1))
                if is_skin(c) or (c[3] and near and sum(c[:3]) < 160):
                    px[x + DX, y + DY] = c
    else:
        paint(im, [(y + DY, x + DX, r) for y, x, r in [
            # miệng ống tay áo (nằm SAU bàn tay — chỉ lộ vành dưới và hai bên)
            (31, 31, '   00000   '), (32, 31, '  0eeddZ0  '), (33, 31, ' 0e96669U0 '), (34, 31, '0ad96669UW0'),
            (35, 31, '0aZ96669WX0'), (36, 31, ' 0ZUUUWWX0 '), (37, 31, '  0000000  '),
            # bàn tay dựng, lòng bàn tay hướng ra trước, 4 ngón khép, ngón cái chìa về phía ngực
            (25, 32, '  00 00  '), (26, 32, ' 0YbIbY0 '), (27, 32, ' 0bbIbb0 '), (28, 32, '00bbbbbb0'),
            (29, 32, '0Yb0bbbV0'), (30, 32, '0bYbbbbV0'), (31, 32, ' 0bbbbVI0'), (32, 32, ' 0IbbVVI0'),
            (33, 32, '  0IVVI0 '), (34, 32, '   0000  '),
        ]])
    return im


def main():
    a, b = pose(1), pose(2)
    sheet = Image.new('RGBA', (W * 2, H), NONE)
    sheet.alpha_composite(a, (0, 0))
    sheet.alpha_composite(b, (W, 0))
    sheet.save(os.path.join(OUT, 'ngu_kiem_s.png'))
    Z = 8
    ims = [frame_s(), a, b]
    pv = Image.new('RGBA', (3 * W * Z + 40, H * Z + 20 + H * 2 + 10), (28, 52, 112, 255))
    for i, f in enumerate(ims):
        pv.alpha_composite(f.resize((W * Z, H * Z), Image.NEAREST), (10 + i * (W * Z + 10), 10))
        pv.alpha_composite(f.resize((W * 2, H * 2), Image.NEAREST), (10 + i * (W * 2 + 10), H * Z + 20))
    pv.save(os.path.join(OUT, 'ngu_kiem_s_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
