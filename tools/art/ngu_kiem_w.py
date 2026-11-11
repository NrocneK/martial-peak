"""
NGỰ KIẾM — hướng W (nhìn ngang sang trái): giữ NGUYÊN thân + tay phải của khung đứng gốc, chỉ thay tay trái.

Nhìn sang trái thì tay trái ở PHÍA GẦN (tay đang buông rõ trước thân); tay cầm kiếm (tay phải) ở phía xa. Tay mới lấy từ hướng E
(tay trái chép theo ảnh mẫu E — ngu_kiem_e.py) LẬT GƯƠNG, khớp theo mặt (mặt E x34 ↔ mặt W x18 → dời +1).
Ảnh mẫu vẽ tay làm động tác ở phía trước thân nên khi lật vẫn đúng là tay ở phía gần.

  1) xóa cẳng tay + bàn tay buông của khung W gốc (khung 2: xóa cả bắp tay áo vì cả cánh tay giơ lên)
  2) lấp chỗ xóa bằng vân áo kề bên lật đối xứng (phần ngực/vạt trước lấy vân bên trái, phần lưng lấy bên phải);
     chỗ bắp tay áo thì lấy vân thân áo ngay bên dưới lật dọc lên
  3) đặt tay đã lật gương

  python3 -I tools/art/ngu_kiem_w.py → tools/art/out/ngu_kiem_w.png (2 khung) + ngu_kiem_w_preview.png
"""
import json
import os
import sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import ngu_kiem_e as E  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
W, H = 52, 68
PAL = {k: tuple(v) for k, v in json.load(open(os.path.join(HERE, 'hero_palette.json'))).items()}
NONE = (0, 0, 0, 0)
SHIFT = 1

# vùng tay buông của khung W gốc: hàng → (x đầu, x cuối, lấy vân từ 'L' trái / 'R' phải)
LOWER = {37: (21, 30, 'R'), 38: (23, 30, 'R'), 39: (23, 30, 'R'), 40: (23, 28, 'R'), 41: (23, 27, 'L'),
         42: (22, 27, 'L'), 43: (22, 27, 'L'), 44: (22, 27, 'L'), 45: (22, 27, 'L')}
# chỗ bắp tay áo (khung 2): lấp bằng vân thân áo ngay bên dưới (hàng 37-44, sau khi đã lấp cẳng tay)
# lật dọc qua mép dưới bắp tay (hàng 36/37) → nếp áo chạy liền lên tới vai
UPPER_ROWS = range(29, 37)
UPPER_X = range(22, 31)


def frame_w():
    sh = Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA')
    return sh.crop((6 * W, 2 * H, 7 * W, 3 * H))


def refill(im, rows):
    px = im.load()
    src = im.copy().load()
    for y, (x0, x1, side) in rows.items():
        for x in range(x0, x1 + 1):
            px[x, y] = src[x0 - 1 - (x - x0), y] if side == 'L' else src[x1 + 1 + (x1 - x), y]
            if not px[x, y][3]:
                px[x, y] = PAL['2']


def arm_overlay(n):
    a = np.array(E.frame_e())
    b = np.array(E.pose(n))
    m = (a != b).any(2)
    o = np.zeros_like(b)
    o[m] = b[m]
    ov = Image.fromarray(o).transpose(Image.FLIP_LEFT_RIGHT)
    return ov.transform(ov.size, Image.AFFINE, (1, 0, -SHIFT, 0, 1, 0))


def pose(n):
    im = frame_w()
    refill(im, LOWER)
    if n == 2:
        px = im.load()
        for y in UPPER_ROWS:
            for x in UPPER_X:
                px[x, y] = px[x, 73 - y]
    im.alpha_composite(arm_overlay(n))
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
