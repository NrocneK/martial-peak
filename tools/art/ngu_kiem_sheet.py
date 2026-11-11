"""
Ghép tư thế thi triển NGỰ KIẾM của 8 hướng thành 1 tấm cho game / trang demo.
  public/ui/hero_cast_ngukiem.png — khung 52x68; hàng = s, sw, w, nw, n, ne, e, se; cột = tư thế 1, tư thế 2
Mỗi hướng do script riêng dựng (ngu_kiem_<hướng>.py); script này chỉ gọi pose(n) của từng cái rồi xếp lại.

  python3 -I tools/art/ngu_kiem_sheet.py → public/ui/hero_cast_ngukiem.png + tools/art/out/ngu_kiem_sheet_preview.png
"""
import importlib
import os
import sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.dirname(os.path.dirname(HERE))
W, H = 52, 68
DIRS = ['s', 'sw', 'w', 'nw', 'n', 'ne', 'e', 'se']


def main():
    sheet = Image.new('RGBA', (W * 2, H * len(DIRS)), (0, 0, 0, 0))
    for r, d in enumerate(DIRS):
        mod = importlib.import_module('ngu_kiem_' + d)
        for n in (1, 2):
            f = mod.pose(n)
            assert f.size == (W, H), (d, n, f.size)
            sheet.alpha_composite(f, (W * (n - 1), H * r))
    sheet.save(os.path.join(ROOT, 'public', 'ui', 'hero_cast_ngukiem.png'))
    walk = Image.open(os.path.join(ROOT, 'public', 'ui', 'hero_b_walk.png')).convert('RGBA')
    Z = 4
    pv = Image.new('RGBA', (8 * (W * Z + 6) + 6, 3 * (H * Z + 4) + 6), (28, 52, 112, 255))
    for i in range(8):
        x = 6 + i * (W * Z + 6)
        pv.alpha_composite(walk.crop((6 * W, i * H, 7 * W, i * H + H)).resize((W * Z, H * Z), Image.NEAREST), (x, 6))
        for n in (1, 2):
            pv.alpha_composite(sheet.crop((W * (n - 1), H * i, W * n, H * i + H)).resize((W * Z, H * Z), Image.NEAREST),
                               (x, 6 + n * (H * Z + 4)))
    pv.save(os.path.join(HERE, 'out', 'ngu_kiem_sheet_preview.png'))
    print('ok')


if __name__ == '__main__':
    main()
