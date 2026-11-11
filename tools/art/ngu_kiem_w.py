"""
NGỰ KIẾM — hướng W (nhìn ngang sang trái): giữ NGUYÊN thân + tay cầm kiếm (tay phải, phía xa) của khung đứng gốc.
Tay TRÁI là tay ở PHÍA GẦN (tay đang buông trước thân trong khung gốc) → vẽ lại chính tay này, cùng cách với hướng NW
(dùng chung refill / limb của ngu_kiem_nw.py):

Tay trái gốc: bắp tay áo trắng x23-30 / y29-36 (vai ≈ (26,29)), cẳng tay áo tối y37-40, bàn tay x22-27 / y41-45.
  1) xóa cẳng tay + bàn tay buông, lấp bằng vân áo kề bên lật đối xứng (vạt trước lấy vân trái, lưng lấy vân phải)
  2) khung 1 (đưa tay lên trước miệng): bắp tay giữ ở vai; cẳng tay từ khuỷu (đáy tay áo) gập lên, bàn tay trước cổ/cằm
     khung 2 (duỗi thẳng ra trước): xóa luôn bắp tay áo (lấp bằng vân thân áo bên dưới lật lên); cánh tay mọc từ
              ĐÚNG VAI GẦN, duỗi ngang sang trái trước thân: tay áo trắng → cẳng tay áo tối → bàn tay
  Bàn tay = đúng điểm ảnh bàn tay gốc, lật cho ngón hướng lên; màu tay áo / cẳng tay = dải màu của tay gốc.

  python3 -I tools/art/ngu_kiem_w.py → tools/art/out/ngu_kiem_w.png (2 khung) + ngu_kiem_w_preview.png
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

# vùng tay buông: hàng → (x đầu, x cuối, lấy vân từ 'L' trái / 'R' phải)
LOWER = {37: (21, 30, 'R'), 38: (23, 30, 'R'), 39: (23, 30, 'R'), 40: (23, 28, 'R'), 41: (23, 27, 'L'),
         42: (22, 27, 'L'), 43: (22, 27, 'L'), 44: (22, 27, 'L'), 45: (22, 27, 'L')}


def frame_w():
    sh = Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA')
    return sh.crop((6 * W, 2 * H, 7 * W, 3 * H))


def hand_up(base):
    """bàn tay gốc (x22-27, y41-45) lật dọc → ngón hướng lên"""
    px = base.load()
    pts = {}
    for y in range(41, 46):
        for x in range(22, 28):
            r, g, b, a = px[x, y]
            if a and r > 150 and r - b > 30:
                pts[(x - 22, 45 - y)] = px[x, y]
    return pts


def refill(im, rows):
    px = im.load()
    src = im.copy().load()
    for y, (x0, x1, side) in rows.items():
        for x in range(x0, x1 + 1):
            px[x, y] = src[x0 - 1 - (x - x0), y] if side == 'L' else src[x1 + 1 + (x1 - x), y]
            if not px[x, y][3]:
                px[x, y] = PAL['2']


def pose(n):
    im = frame_w()
    hand = hand_up(im)
    refill(im, LOWER)
    if n == 1:
        # khuỷu ở đáy bắp tay áo (25,37) → cổ tay trước cổ (20,30); bàn tay dựng trước cằm
        NW.limb(im, [((25, 37), (20, 30), 1.6, NW.FORE)], (16, 25, hand))
    else:
        # bỏ bắp tay áo buông: lấp bằng vân thân áo ngay bên dưới, lật dọc qua hàng 36/37
        px = im.load()
        for y in range(29, 37):
            for x in range(22, 31):
                px[x, y] = px[x, 73 - y]
        # vai gần (26,30) → khuỷu (18,30) tay áo trắng; khuỷu → cổ tay (12,30) cẳng tay áo tối; bàn tay dựng ở đầu
        NW.limb(im, [((26, 30), (18, 30), 2.6, NW.SLEEVE), ((18, 30), (12, 30), 1.6, NW.FORE)], (7, 25, hand))
    return im


def main():
    a, b = pose(1), pose(2)
    sheet = Image.new('RGBA', (W * 2, H), NONE)
    sheet.alpha_composite(a, (0, 0))
    sheet.alpha_composite(b, (W, 0))
    sheet.save(os.path.join(OUT, 'ngu_kiem_w.png'))
    Z = 8
    ims = [frame_w(), a, b]
    pv = Image.new('RGBA', (3 * W * Z + 40, H * Z + 20 + H * 2 + 10), (28, 52, 112, 255))
    for i, f in enumerate(ims):
        pv.alpha_composite(f.resize((W * Z, H * Z), Image.NEAREST), (10 + i * (W * Z + 10), 10))
        pv.alpha_composite(f.resize((W * 2, H * 2), Image.NEAREST), (10 + i * (W * 2 + 10), H * Z + 20))
    pv.save(os.path.join(OUT, 'ngu_kiem_w_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
