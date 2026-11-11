"""
NGỰ KIẾM — hướng SW (chéo xuống trái): giữ NGUYÊN thân + tay cầm kiếm (tay phải, phía xa, bên trái người xem).
Tay TRÁI là tay ở PHÍA GẦN (bên phải người xem) → vẽ lại chính tay này, cùng cách với W / NW.

Tay trái gốc: bắp tay áo trắng x30-37 / y29-36 (vai ≈ (33,29)), cẳng tay áo tối y37-40, bàn tay x31-36 / y41-44.
  1) xóa cẳng tay + bàn tay buông, lấp bằng vân áo bên trái (thân / vạt trước) lật đối xứng; viền lại mép phải thân
  2) khung 1 (đưa tay lên trước ngực): bắp tay giữ ở vai; cẳng tay gập từ khuỷu lên, bàn tay dựng trước ngực
     khung 2 (duỗi thẳng ra trước = chếch xuống trái, về phía người xem): xóa luôn bắp tay áo (lấp bằng vân thân áo
              bên dưới lật lên); cánh tay mọc từ ĐÚNG VAI GẦN, duỗi chéo trước thân: tay áo trắng → cẳng tay áo tối → bàn tay
  Bàn tay = đúng điểm ảnh bàn tay gốc, lật cho ngón hướng lên; màu tay áo / cẳng tay = dải màu của tay gốc.

  python3 -I tools/art/ngu_kiem_sw.py → tools/art/out/ngu_kiem_sw.png (2 khung) + ngu_kiem_sw_preview.png
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

# hàng → (x đầu lấp vân, x viền mép thân (None = không viền), x cuối xóa)
LOWER = {37: (29, 36, 38), 38: (30, 36, 39), 39: (30, 36, 40), 40: (31, 37, 41), 41: (30, 37, 37),
         42: (30, 37, 37), 43: (30, None, 36), 44: (30, None, 34)}


def frame_sw():
    sh = Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA')
    return sh.crop((6 * W, 1 * H, 7 * W, 2 * H))


def hand_up(base):
    px = base.load()
    pts = {}
    for y in range(41, 45):
        for x in range(31, 37):
            r, g, b, a = px[x, y]
            if a and r > 150 and r - b > 30:
                pts[(x - 31, 44 - y)] = px[x, y]
    return pts


def refill(im):
    px = im.load()
    src = im.copy().load()
    for y, (x0, edge, x1) in LOWER.items():
        for x in range(x0, x1 + 1):
            if edge is not None and x == edge:
                px[x, y] = PAL['2']
            elif edge is not None and x > edge:
                px[x, y] = NONE
            else:
                px[x, y] = src[x0 - 1 - (x - x0), y]


def pose(n):
    im = frame_sw()
    hand = hand_up(im)
    refill(im)
    if n == 1:
        # khuỷu ở đáy bắp tay áo (34,37) → cổ tay trước ngực (29,30); bàn tay dựng trước ngực
        NW.limb(im, [((34, 37), (29, 30), 1.6, NW.FORE)], (26, 26, hand))
    else:
        px = im.load()
        for y in range(29, 37):
            for x in range(30, 38):
                px[x, y] = px[x, 73 - y]
        # vai gần (33,30) → khuỷu (26,33) tay áo trắng; khuỷu → cổ tay (19,35) cẳng tay áo tối; bàn tay dựng ở đầu,
        # ló ra khỏi mép trái thân → đọc rõ là tay duỗi ra phía trước-trái
        NW.limb(im, [((33, 30), (26, 33), 2.6, NW.SLEEVE), ((26, 33), (19, 35), 1.6, NW.FORE)], (13, 30, hand))
    return im


def main():
    a, b = pose(1), pose(2)
    sheet = Image.new('RGBA', (W * 2, H), NONE)
    sheet.alpha_composite(a, (0, 0))
    sheet.alpha_composite(b, (W, 0))
    sheet.save(os.path.join(OUT, 'ngu_kiem_sw.png'))
    Z = 8
    ims = [frame_sw(), a, b]
    pv = Image.new('RGBA', (3 * W * Z + 40, H * Z + 20 + H * 2 + 10), (28, 52, 112, 255))
    for i, f in enumerate(ims):
        pv.alpha_composite(f.resize((W * Z, H * Z), Image.NEAREST), (10 + i * (W * Z + 10), 10))
        pv.alpha_composite(f.resize((W * 2, H * 2), Image.NEAREST), (10 + i * (W * 2 + 10), H * Z + 20))
    pv.save(os.path.join(OUT, 'ngu_kiem_sw_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
