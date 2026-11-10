"""
Biến thể tư thế của sprite nhân vật (dựng từ public/ui/hero_full.png sau khi build tools/art/hero.px.js).

  python3 -I tools/art/hero_poses.py   → public/ui/hero_full_fan.png + public/ui/hero_fist.png

hero_full_fan: cầm QUẠT che trước ngực. Xóa nắm tay phải đang buông (tay phía xa, mép trái), tô tối miệng ống
tay áo (áo cổ phong tay rộng vẫn rủ xuống khi gập cẳng tay lên), vẽ lại viền. Quạt + bàn tay vẽ trong hình
wp_fan_held_* đặt trước ngực.

hero_fist: riêng NẮM TAY PHẢI (khung 0) để đặt ĐÈ lên chuôi kiếm / đao (vũ khí nằm giữa thân và nắm tay):
các ngón như đang nắm quanh chuôi — đốc nhô lên trên nắm tay, hộ thủ ở dưới. Vị trí trên nhân vật: FIST_COVER (items.ts).
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'public', 'ui', 'hero_full.png')
OUT = os.path.join(ROOT, 'public', 'ui', 'hero_full_fan.png')
FW = 58                     # bề rộng một khung
FIST = (3, 52, 10, 60)      # x0, y0, x1, y1: nắm tay phải + cổ tay áo trên khung đã lật
OUTLINE = (18, 14, 28, 255)
SLEEVE_IN = (38, 40, 56, 255)
BREATH = [0, 1, 1, 0]       # hero_full: cả người (trừ ủng) hạ 1px ở khung 1-2 → nắm tay cũng hạ theo

a = np.array(Image.open(SRC).convert('RGBA'))

# ---- nắm tay riêng (cắt từ khung 0 trước khi sửa): x 3..8, y 54..60, chỉ lấy da + viền tối
FC = (3, 54, 9, 61)
cov = a[FC[1]:FC[3], FC[0]:FC[2]].copy()
for yy in range(cov.shape[0]):
    for xx in range(cov.shape[1]):
        r, g, b, al = (int(v) for v in cov[yy, xx])
        skin = r > 90 and r > g > b
        dark = r + g + b < 200
        if not al or not (skin or dark):
            cov[yy, xx] = 0
Image.fromarray(cov, 'RGBA').save(os.path.join(ROOT, 'public', 'ui', 'hero_fist.png'))

for f in range(a.shape[1] // FW):
    fr = a[:, f * FW:(f + 1) * FW]
    x0, y0, x1, y1 = FIST
    y0 += BREATH[f]; y1 += BREATH[f]
    fr[y0:y1, x0:x1] = 0
    # miệng ống tay áo: hàng ngay trên vùng xóa, những điểm là vải (không phải viền) → tô tối
    for x in range(x0 + 1, x1 - 1):
        p = fr[y0 - 1, x]
        if p[3] and p[:3].sum() > 120:
            fr[y0 - 1, x] = SLEEVE_IN
    # vẽ lại viền: điểm trong suốt (trong vùng xóa) cạnh điểm đặc → màu viền
    edge = []
    for y in range(y0 - 1, y1 + 1):
        for x in range(max(0, x0 - 1), min(FW, x1 + 1)):
            if fr[y, x, 3]:
                continue
            nb = [(y + dy, x + dx) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= y + dy < fr.shape[0] and 0 <= x + dx < FW]
            if any(fr[yy, xx, 3] and tuple(fr[yy, xx]) != OUTLINE for yy, xx in nb):
                edge.append((y, x))
    for y, x in edge:
        fr[y, x] = OUTLINE
Image.fromarray(a, 'RGBA').save(OUT)
print('→', OUT)
