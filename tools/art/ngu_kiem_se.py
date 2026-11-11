"""
NGỰ KIẾM — hướng SE (chéo xuống phải): giữ NGUYÊN thân + tay cầm kiếm (tay phải, phía gần, bên trái người xem).
Tay TRÁI ở PHÍA XA (bên phải người xem) — đúng như ảnh mẫu SE → lấy tay trái theo điểm ảnh bản chép ảnh mẫu
(trace/ngu_kiem_trace_se1/se2.png, chép bằng trace_ref.py), dời +1 cho khớp vai, đặt lên khung gốc.

  1) xóa cẳng tay + bàn tay trái buông của khung gốc (cột tối x33-37 / y31-37), viền lại mép phải thân
  2) khung 1: bàn tay dựng trước ngực/cằm (mẫu se1, vùng x31-37 / y24-32)
     khung 2: tay duỗi ngang sang phải: tay áo trắng → cẳng tay áo xanh → bàn tay dựng (mẫu se2, vùng x31-51 / y22-31)

  python3 -I tools/art/ngu_kiem_se.py → tools/art/out/ngu_kiem_se.png (2 khung) + ngu_kiem_se_preview.png
"""
import json
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
W, H = 52, 68
PAL = {k: tuple(v) for k, v in json.load(open(os.path.join(HERE, 'hero_palette.json'))).items()}
NONE = (0, 0, 0, 0)
DX, DY = 1, 0
SRC = {1: ('ngu_kiem_trace_se1.png', (31, 24, 38, 33)), 2: ('ngu_kiem_trace_se2.png', (31, 22, 52, 32))}


def frame_se():
    sh = Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA')
    return sh.crop((6 * W, 7 * H, 7 * W, 8 * H))


def pose(n):
    im = frame_se()
    px = im.load()
    for y in range(31, 38):              # bỏ tay trái buông phía xa
        px[33, y] = PAL['2']
        for x in range(34, 39):
            px[x, y] = NONE
    name, (x0, y0, x1, y1) = SRC[n]
    src = Image.open(os.path.join(HERE, 'trace', name)).convert('RGBA')
    sp = src.load()
    for y in range(y0, y1):
        for x in range(x0, min(x1, src.width)):
            if sp[x, y][3] and 0 <= x + DX < W:
                px[x + DX, y + DY] = sp[x, y]
    return im


def main():
    a, b = pose(1), pose(2)
    sheet = Image.new('RGBA', (W * 2, H), NONE)
    sheet.alpha_composite(a, (0, 0))
    sheet.alpha_composite(b, (W, 0))
    sheet.save(os.path.join(OUT, 'ngu_kiem_se.png'))
    Z = 8
    ims = [frame_se(), a, b]
    pv = Image.new('RGBA', (3 * W * Z + 40, H * Z + 20 + H * 2 + 10), (28, 52, 112, 255))
    for i, f in enumerate(ims):
        pv.alpha_composite(f.resize((W * Z, H * Z), Image.NEAREST), (10 + i * (W * Z + 10), 10))
        pv.alpha_composite(f.resize((W * 2, H * 2), Image.NEAREST), (10 + i * (W * 2 + 10), H * Z + 20))
    pv.save(os.path.join(OUT, 'ngu_kiem_se_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
