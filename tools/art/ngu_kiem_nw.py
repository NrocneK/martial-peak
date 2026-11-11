"""
NGỰ KIẾM — hướng NW (quay lưng, chéo lên trái): giữ NGUYÊN thân + tay phải của khung đứng gốc.
Tay trái KHÔNG vẽ mới: dùng chính cánh tay trái gốc, tách 2 khúc tại khuỷu rồi xoay bằng rotsprite.py
→ giữ đúng chiều dài, độ dày, nếp áo, bàn tay của nhân vật.

Tay trái gốc (phía gần, bên trái người xem): bắp tay áo trắng y29-36, cẳng tay áo tối y36-39, bàn tay y40-43.
  vai ≈ (22, 30), khuỷu ≈ (21, 36)
Chỗ tay gốc để lại: lấp bằng vân áo kề bên lật đối xứng qua mép chỗ xóa, viền lại mép ngoài.

  khung 1 (đưa tay lên trước miệng): bắp tay giữ nguyên ở vai; khúc dưới (cẳng tay + bàn tay) xoay quanh khuỷu
           cho ngón hướng lên phía mặt
  khung 2 (duỗi thẳng ra trước = chếch lên trái, xa người xem): cả cánh tay xoay quanh vai chĩa lên trái,
           co ngắn theo phối cảnh vì chĩa ra xa

  python3 -I tools/art/ngu_kiem_nw.py → tools/art/out/ngu_kiem_nw.png (2 khung) + ngu_kiem_nw_preview.png
"""
import json
import os
import sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from rotsprite import rotate  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
W, H = 52, 68
PAL = {k: tuple(v) for k, v in json.load(open(os.path.join(HERE, 'hero_palette.json'))).items()}
NONE = (0, 0, 0, 0)

# điểm ảnh của tay trái gốc theo hàng: (x đầu, x cuối) — gồm cả nét viền
UPPER = {29: (18, 24), 30: (18, 25), 31: (18, 25), 32: (17, 25), 33: (16, 25), 34: (16, 25), 35: (16, 25)}
LOWER = {36: (17, 26), 37: (18, 26), 38: (18, 27), 39: (17, 24), 40: (17, 23), 41: (16, 23), 42: (17, 23), 43: (17, 23)}
SHOULDER = (22, 30)
ELBOW = (21, 36)
# mép áo mới sau khi bỏ tay (x viền ngoài) theo hàng
EDGE = {29: 19, 30: 19, 31: 19, 32: 19, 33: 19, 34: 19, 35: 19, 36: 18, 37: 18, 38: 18, 39: 17, 40: 17,
        41: 16, 42: 17, 43: 17}


def frame():
    sh = Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA')
    return sh.crop((6 * W, 3 * H, 7 * W, 4 * H))


def take(im, rows):
    lay = Image.new('RGBA', (W, H), NONE)
    sp, lp = im.load(), lay.load()
    for y, (a, b) in rows.items():
        for x in range(a, b + 1):
            lp[x, y] = sp[x, y]
    return lay


def refill(im, rows):
    px = im.load()
    src = im.copy().load()
    for y, (x0, x1) in rows.items():
        edge = EDGE[y]
        for x in range(min(x0, edge), x1 + 1):
            px[x, y] = NONE
        for x in range(edge + 1, x1 + 1):
            px[x, y] = src[x1 + 1 + (x1 - x), y]
        px[edge, y] = PAL['2']


def put(im, lay):
    """đặt lớp tay lên khung; viền lại chỗ tay giáp nền trong suốt"""
    base = im.copy().load()
    im.alpha_composite(lay)
    px, lp = im.load(), lay.load()
    for y in range(H):
        for x in range(W):
            if not lp[x, y][3]:
                continue
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < W and 0 <= ny < H and not lp[nx, ny][3] and not base[nx, ny][3]:
                    px[nx, ny] = PAL['2']


def pose(n):
    im = frame()
    upper, lower = take(im, UPPER), take(im, LOWER)
    if n == 1:
        refill(im, LOWER)
        # cẳng tay + bàn tay xoay quanh khuỷu ~155° (chúc xuống → hướng lên phía mặt); cẳng tay đưa ra trước
        # nên nằm SAU bắp tay áo (phía gần người xem) → vẽ khúc dưới trước, đặt lại bắp tay áo đè lên
        put(im, rotate(lower, ELBOW, -155, dest=(21, 34)))
        im.alpha_composite(upper)
    else:
        refill(im, UPPER)
        refill(im, LOWER)
        arm = Image.alpha_composite(upper, lower)
        # cả cánh tay xoay quanh vai ~145° (buông xuống → chếch lên trái), co còn 70% vì chĩa ra xa người xem
        put(im, rotate(arm, SHOULDER, -145, scale_along=(0.7, 90)))
    return im


def main():
    a, b = pose(1), pose(2)
    sheet = Image.new('RGBA', (W * 2, H), NONE)
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
