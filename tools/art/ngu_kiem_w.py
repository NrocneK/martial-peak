"""
NGỰ KIẾM — hướng W (nhìn ngang sang trái): giữ NGUYÊN thân + tay đang buông (tay cầm kiếm — sprite W là E lật gương,
và trong sprite chém đây cũng là tay vung kiếm) của khung đứng gốc.

Tay làm động tác ở PHÍA XA giống hệt hướng E → lấy đúng lớp tay của hướng E (tay chép theo ảnh mẫu E — ngu_kiem_e.py),
LẬT GƯƠNG, khớp theo mặt (mặt E x34 ↔ mặt W x18 → dời +1) rồi đặt lên. Không xóa gì của khung gốc.

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

def frame_w():
    sh = Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA')
    return sh.crop((6 * W, 2 * H, 7 * W, 3 * H))


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
