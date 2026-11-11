"""
NGỰ KIẾM — hướng NW (quay lưng, chéo lên trái): giữ NGUYÊN thân + tay phải của khung đứng gốc, chỉ vẽ lại tay trái.

Tay trái ở PHÍA GẦN (bên trái người xem). Trong khung gốc: bắp tay áo trắng x17-24 / y29-36,
cẳng tay áo tối y36-39 (màu G B 5 7 6 0), bàn tay x18-22 / y40-43 (ngón chúc xuống).

1) Xóa cẳng tay + bàn tay buông: lấp chỗ trống bằng VÂN ÁO BÊN CẠNH lật đối xứng qua mép chỗ xóa
   (nếp áo chạy liền, không tô một màu), rồi viền lại mép ngoài như mép áo gốc.
2) Vẽ lại tay bằng chính các phần của tay gốc:
   - cẳng tay: dải áo tối, màu lấy theo thứ tự sáng→tối của cẳng tay gốc
   - bàn tay: đúng các điểm ảnh của bàn tay gốc, lật cho ngón hướng lên
   - viền: chỗ giáp nền dùng nét viền ngoài (2), chỗ đè lên thân dùng nét trong (0) — như tay áo gốc giáp thân
   khung 1 (đưa tay lên trước miệng): bắp tay giữ ở vai, khuỷu gập ở hông, cẳng tay chạy chéo lên phía mặt (lộ ra
            bên trái thân), bàn tay khuất một nửa sau má
   khung 2 (duỗi thẳng ra trước = chếch lên trái, xa người xem): bắp tay áo trắng vung lên theo, chỗ bắp tay cũ ở hông
            cũng lấp bằng vân áo; cánh tay ngắn lại vì chĩa ra xa

  python3 -I tools/art/ngu_kiem_nw.py → tools/art/out/ngu_kiem_nw.png (2 khung) + ngu_kiem_nw_preview.png
"""
import json
import math
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
W, H = 52, 68
PAL = {k: tuple(v) for k, v in json.load(open(os.path.join(HERE, 'hero_palette.json'))).items()}
NONE = (0, 0, 0, 0)

# vùng tay buông cần xóa: hàng → (x đầu, x cuối, mép áo mới)
ERASE_FORE = {36: (19, 25, 18), 37: (19, 26, 18), 38: (19, 27, 18), 39: (18, 24, 17), 40: (18, 23, 17),
              41: (17, 23, 16), 42: (18, 23, 17), 43: (18, 23, 17)}
ERASE_UPPER = {29: (18, 23, 19), 30: (18, 24, 19), 31: (18, 24, 19), 32: (17, 24, 19), 33: (16, 24, 19),
               34: (16, 24, 19), 35: (16, 24, 19)}

FORE = ['G', 'B', '5', '7']               # cẳng tay áo gốc: sáng → tối
SLEEVE = ['e', 'd', 'c', 'Z', 'a', 'T']   # tay áo trắng gốc: sáng → tối


def frame():
    sh = Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA')
    return sh.crop((6 * W, 3 * H, 7 * W, 4 * H))


def hand_up(base):
    """bàn tay gốc (x18-22, y40-43) lật dọc → ngón hướng lên"""
    px = base.load()
    pts = {}
    for y in range(40, 44):
        for x in range(17, 23):
            c = px[x, y]
            r, g, b, a = c
            if a and r > 150 and r - b > 30:
                pts[(x - 17, 43 - y)] = c
    return pts


def refill(im, rows):
    """lấp vùng xóa bằng vân áo bên phải lật đối xứng qua mép; viền mép ngoài"""
    px = im.load()
    src = im.copy().load()
    for y, (x0, x1, edge) in rows.items():
        for x in range(min(x0, edge), x1 + 1):
            px[x, y] = NONE
        for x in range(edge + 1, x1 + 1):
            px[x, y] = src[x1 + 1 + (x1 - x), y]
        px[edge, y] = PAL['2']


def limb(im, segs, hand=None):
    """vẽ đoạn tay: segs = [(đầu, cuối, bán kính, dải màu)], hand = (gốc x, gốc y, điểm ảnh bàn tay)"""
    base = im.copy().load()
    px = im.load()
    fill = {}
    for (ax, ay), (bx, by), r, cols in segs:
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy) or 1
        for y in range(int(min(ay, by) - r - 2), int(max(ay, by) + r + 3)):
            for x in range(int(min(ax, bx) - r - 2), int(max(ax, bx) + r + 3)):
                t = max(0, min(1, ((x - ax) * dx + (y - ay) * dy) / (L * L)))
                cx, cy = ax + t * dx, ay + t * dy
                d = math.hypot(x - cx, y - cy)
                if d <= r:
                    side = ((x - cx) * (-dy) + (y - cy) * dx) / L       # lệch về phía trên-trái → sáng
                    k = (r - side) / (2 * r)
                    fill[(x, y)] = PAL[cols[min(len(cols) - 1, max(0, int(k * len(cols))))]]
    if hand:
        hx, hy, pts = hand
        for (x, y), c in pts.items():
            fill[(hx + x, hy + y)] = c
    for (x, y), c in fill.items():
        if 0 <= x < W and 0 <= y < H:
            px[x, y] = c
    for (x, y) in fill:
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if (nx, ny) in fill or not (0 <= nx < W and 0 <= ny < H):
                continue
            px[nx, ny] = PAL['2'] if base[nx, ny][3] == 0 else PAL['0']


def pose(n):
    im = frame()
    hand = hand_up(im)
    refill(im, ERASE_FORE)
    if n == 1:
        # khuỷu ở đáy bắp tay áo (20,36) → cổ tay dưới cằm (17,25); bàn tay che mép mặt bên trái
        limb(im, [((20, 36), (17, 25), 1.6, FORE)], (15, 19, hand))
    else:
        refill(im, ERASE_UPPER)
        # tay GẦN (vai trái, bên trái người xem — đúng chỗ tay cũ) duỗi ra trước = chếch sang trái, hơi lên;
        # nằm TRƯỚC thân, không đi ra sau đầu. Vai (20,31) → khuỷu (14,28) tay áo trắng; khuỷu → cổ tay (9,26) áo tối
        limb(im, [((20, 31), (14, 28), 2.8, SLEEVE), ((14, 28), (9, 26), 1.6, FORE)], (4, 21, hand))
    return im


def main():
    a, b = pose(1), pose(2)
    sheet = Image.new('RGBA', (W * 2, H), (0, 0, 0, 0))
    sheet.alpha_composite(a, (0, 0))
    sheet.alpha_composite(b, (W, 0))
    sheet.save(os.path.join(OUT, 'ngu_kiem_nw.png'))
    Z = 8
    ims = [frame(), a, b]
    pv = Image.new('RGBA', (3 * W * Z + 40, H * Z + 20 + H * 2 + 10), (28, 52, 112, 255))
    for i, f in enumerate(ims):
        pv.alpha_composite(f.resize((W * Z, H * Z), Image.NEAREST), (10 + i * (W * Z + 10), 10))
        pv.alpha_composite(f.resize((W * 2, H * 2), Image.NEAREST), (10 + i * (W * 2 + 10), H * Z + 20))
    pv.save(os.path.join(OUT, 'ngu_kiem_nw_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
